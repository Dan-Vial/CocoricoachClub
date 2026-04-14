import { corsHeaders } from '@supabase/supabase-js/cors'

interface FisResult {
  date: string           // YYYY-MM-DD
  place: string
  nation: string
  category: string       // WC, OWG, FIS, EC, etc.
  categoryFull: string   // World Cup, Olympic Winter Games, etc.
  discipline: string     // Slopestyle, Big Air, Halfpipe
  position: number | null
  fisPoints: number | null
  cupPoints: number | null
}

interface FisAthleteInfo {
  name: string
  fisCode: string
  nation: string
  birthDate: string | null
  results: FisResult[]
}

function parseDate(raw: string): string {
  // Format: DD-MM-YYYY -> YYYY-MM-DD
  const parts = raw.trim().split('-')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return raw
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.trim()
  if (!cleaned || cleaned === 'DNS' || cleaned === 'DNF' || cleaned === 'DSQ' || cleaned === 'NQ') return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function extractTextContent(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function parseResultsFromHtml(html: string): FisResult[] {
  const results: FisResult[] = []
  
  // Find all table-row anchor elements
  const rowRegex = /<a\s+class="table-row"[^>]*>([\s\S]*?)<\/a>/g
  let match
  
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1]
    
    // Extract date (first g-xs-4 div)
    const dateMatch = rowHtml.match(/<div class="g-xs-4 g-sm-4 g-md-4 g-lg-4 justify-left">([^<]+)<\/div>/)
    if (!dateMatch) continue
    const date = parseDate(dateMatch[1])
    
    // Extract place (hidden-sm-down)
    const placeMatch = rowHtml.match(/<div class="g-md g-lg justify-left hidden-sm-down">([^<]+)<\/div>/)
    const place = placeMatch ? placeMatch[1].trim() : ''
    
    // Extract nation code
    const nationMatch = rowHtml.match(/<span class="country__name-short">([^<]+)<\/span>/)
    const nation = nationMatch ? nationMatch[1].trim() : ''
    
    // Extract category short (from hidden-sm-up div inside the nation/cat column)
    const catShortMatch = rowHtml.match(/<div class="g-xs-24 justify-left hidden-sm-up">([^<]+)<\/div>/)
    const categoryShort = catShortMatch ? catShortMatch[1].trim() : ''
    
    // Extract category full (hidden-sm-down in the category column)
    const catFullMatch = rowHtml.match(/<div class="g-md-5 g-lg-5 justify-left hidden-sm-down">([^<]+)<\/div>/)
    const categoryFull = catFullMatch ? catFullMatch[1].trim() : categoryShort
    
    // Extract discipline (hidden-sm-down in discipline column)
    const discMatch = rowHtml.match(/<div class="g-md-3 g-lg-3 justify-left hidden-sm-down">([^<]+)<\/div>/)
    const discipline = discMatch ? discMatch[1].trim() : ''
    
    // Extract position, FIS points, cup points from the right side
    const rightSection = rowHtml.match(/<div class="g-xs-6 g-sm-6 g-md-6 g-lg-6 justify-right[^"]*">([\s\S]*?)<\/div>\s*<\/div>/)
    
    let position: number | null = null
    let fisPoints: number | null = null
    let cupPoints: number | null = null
    
    if (rightSection) {
      const rightHtml = rightSection[1]
      // Position is first justify-right div
      const posMatch = rightHtml.match(/<div class="g-xs-24 g-sm g-md g-lg justify-right">([^<]*)<\/div>/)
      if (posMatch) position = parseNumber(posMatch[1])
      
      // FIS points and cup points are in g-sm-8 divs
      const ptsMatches = [...rightHtml.matchAll(/<div class="g-xs-24 g-sm-8 g-md-8 g-lg-8 justify-right">([^<]*)<\/div>/g)]
      if (ptsMatches.length >= 1) fisPoints = parseNumber(ptsMatches[0][1])
      if (ptsMatches.length >= 2) cupPoints = parseNumber(ptsMatches[1][1])
    }
    
    // Skip qualification rounds (no FIS points) and DNS/DNF
    if (position === null && fisPoints === null) continue
    
    results.push({
      date,
      place,
      nation,
      category: categoryShort,
      categoryFull,
      discipline,
      position,
      fisPoints,
      cupPoints,
    })
  }
  
  return results
}

function parseAthleteInfo(html: string, competitorId: string): FisAthleteInfo {
  // Extract name from h1 or the main heading
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || html.match(/<div class="athlete-profile__name[^"]*">([^<]+)<\/div>/)
  const name = nameMatch ? nameMatch[1].trim() : 'Unknown'
  
  // Extract FIS code
  const fisCodeMatch = html.match(/FIS Code[^<]*<[^>]*>(\d+)/) || html.match(/FIS\s*Code\s*(\d+)/)
  const fisCode = fisCodeMatch ? fisCodeMatch[1] : competitorId
  
  // Extract nation
  const nationMatch = html.match(/class="athlete-profile__country-name[^"]*">([^<]+)/)
  const nationName = nationMatch ? nationMatch[1].trim() : ''
  
  // Extract birth date
  const birthMatch = html.match(/Birthdate[^<]*<[^>]*>(\d{2}-\d{2}-\d{4})/) || html.match(/Birthdate(\d{2}-\d{2}-\d{4})/)
  const birthDate = birthMatch ? parseDate(birthMatch[1]) : null
  
  const results = parseResultsFromHtml(html)
  
  return {
    name,
    fisCode,
    nation: nationName,
    birthDate,
    results,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const { competitorId, sectorCode } = await req.json()
    
    if (!competitorId) {
      return new Response(
        JSON.stringify({ success: false, error: 'competitorId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const sector = sectorCode || 'SB'
    const url = `https://www.fis-ski.com/DB/general/athlete-biography.html?sectorcode=${sector}&competitorid=${competitorId}&type=result`
    
    console.log(`Fetching FIS results from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `FIS returned ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const html = await response.text()
    const athleteInfo = parseAthleteInfo(html, competitorId)
    
    console.log(`Parsed ${athleteInfo.results.length} results for ${athleteInfo.name}`)
    
    return new Response(
      JSON.stringify({ success: true, data: athleteInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error scraping FIS:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
