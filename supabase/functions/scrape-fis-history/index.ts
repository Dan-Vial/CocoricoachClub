const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const BodySchema = z.object({
  url: z.string().url().refine(
    (u) => u.includes('fis-ski.com') && u.includes('athlete-biography'),
    'URL must be a FIS athlete biography page'
  ),
  discipline_filter: z.string().optional(),
})

interface FisResult {
  date: string
  place: string
  country: string
  category: string
  discipline: string
  position: string | null
  fis_points: number | null
  cup_points: number | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { url } = parsed.data

    // Ensure the URL has type=result parameter
    const fisUrl = new URL(url)
    if (!fisUrl.searchParams.get('type')) {
      fisUrl.searchParams.set('type', 'result')
    }

    console.log('Scraping FIS page:', fisUrl.toString())

    // Use Firecrawl to scrape the JS-rendered page
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: fisUrl.toString(),
        formats: ['markdown', 'html'],
        waitFor: 3000, // Wait for JS to render the results table
        onlyMainContent: false,
      }),
    })

    const scrapeData = await scrapeResponse.json()
    
    if (!scrapeResponse.ok) {
      console.error('Firecrawl error:', JSON.stringify(scrapeData))
      return new Response(JSON.stringify({ error: 'Failed to scrape FIS page', details: scrapeData }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''
    const html = scrapeData.data?.html || scrapeData.html || ''

    // Extract athlete info from the page
    const athleteInfo = extractAthleteInfo(markdown)

    // Parse competition results from HTML table
    const results = parseResultsFromHtml(html)

    // If HTML parsing didn't work, try markdown
    const finalResults = results.length > 0 ? results : parseResultsFromMarkdown(markdown)

    console.log(`Parsed ${finalResults.length} results for athlete`)

    return new Response(JSON.stringify({
      success: true,
      athlete: athleteInfo,
      results: finalResults,
      raw_markdown_preview: markdown.substring(0, 500),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function extractAthleteInfo(markdown: string): { name?: string; fis_code?: string; birthdate?: string; nation?: string } {
  const info: Record<string, string> = {}

  // Try to extract FIS Code
  const fisCodeMatch = markdown.match(/FIS\s*Code\s*(\d+)/i)
  if (fisCodeMatch) info.fis_code = fisCodeMatch[1]

  // Try to extract birthdate
  const birthMatch = markdown.match(/Birthdate\s*(\d{2}\/\d{2}\/\d{4}|\d{4})/i)
  if (birthMatch) info.birthdate = birthMatch[1]

  return info
}

function parseResultsFromHtml(html: string): FisResult[] {
  const results: FisResult[] = []
  
  // Match table rows in the results table
  // FIS uses a specific table structure with divs inside
  const rowRegex = /<div[^>]*class="[^"]*g-row[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*g-row|$)/gi
  const cellRegex = /<div[^>]*class="[^"]*g-(?:xs|sm|md|lg|xl)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  // Alternative: try to find table rows
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let trMatch
  while ((trMatch = trRegex.exec(html)) !== null) {
    const row = trMatch[1]
    const cells: string[] = []
    let tdMatch
    const tdRegexLocal = /<td[^>]*>([\s\S]*?)<\/td>/gi
    while ((tdMatch = tdRegexLocal.exec(row)) !== null) {
      cells.push(stripHtml(tdMatch[1]).trim())
    }
    
    // A result row typically has: Date, Place, Country, Category, Discipline, Position, FIS Points, Cup Points
    if (cells.length >= 5) {
      const dateStr = cells[0]
      if (/\d{2}\s+\w+\s+\d{4}|\d{2}\/\d{2}\/\d{4}|\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        results.push({
          date: dateStr,
          place: cells[1] || '',
          country: cells[2] || '',
          category: cells[3] || '',
          discipline: cells[4] || '',
          position: cells[5] || null,
          fis_points: cells[6] ? parseFloat(cells[6]) || null : null,
          cup_points: cells[7] ? parseFloat(cells[7]) || null : null,
        })
      }
    }
  }

  return results
}

function parseResultsFromMarkdown(markdown: string): FisResult[] {
  const results: FisResult[] = []
  const lines = markdown.split('\n')

  // Look for lines that start with a date pattern
  const datePattern = /^(\d{2}\s+\w{3}\s+\d{4})/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const dateMatch = line.match(datePattern)
    if (dateMatch) {
      // Try to parse the rest of the line as result data
      const parts = line.split(/\s{2,}|\t/)
      if (parts.length >= 3) {
        results.push({
          date: parts[0].trim(),
          place: parts[1]?.trim() || '',
          country: '',
          category: parts[2]?.trim() || '',
          discipline: parts[3]?.trim() || '',
          position: parts[4]?.trim() || null,
          fis_points: parts[5] ? parseFloat(parts[5]) || null : null,
          cup_points: parts[6] ? parseFloat(parts[6]) || null : null,
        })
      }
    }
  }

  return results
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
}
