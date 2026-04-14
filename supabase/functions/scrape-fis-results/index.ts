const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface FisResult {
  date: string
  place: string
  nation: string
  category: string
  categoryFull: string
  discipline: string
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

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
}

function parseDate(raw: string): string {
  const parts = raw.trim().split('-')
  if (parts.length === 3 && parts[0].length <= 2) {
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

/**
 * Step 1: Search for athlete by FIS code on the biographies page.
 * Returns { competitorId, name, nation, fisCode, birthDate } or null.
 */
async function searchAthleteByFisCode(fisCode: string, sectorCode: string): Promise<{
  competitorId: string
  name: string
  nation: string
  fisCode: string
  birthYear: string | null
} | null> {
  const url = `https://www.fis-ski.com/DB/general/biographies.html?sectorcode=${sectorCode}&fiscode=${fisCode}&search=true`
  console.log(`Searching athlete by FIS code: ${url}`)

  const response = await fetch(url, { headers: FETCH_HEADERS })
  if (!response.ok) return null

  const html = await response.text()

  // Find the first table-row link with competitorid
  const rowMatch = html.match(/<a\s+class="table-row"\s+href="[^"]*competitorid=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/)
  if (!rowMatch) {
    console.log('No athlete found for FIS code:', fisCode)
    return null
  }

  const competitorId = rowMatch[1]
  const rowHtml = rowMatch[2]

  // Extract FIS code from the search result
  const codeMatch = rowHtml.match(/<div[^>]*justify-left[^>]*>(\d{5,})<\/div>/)
  const actualFisCode = codeMatch ? codeMatch[1].trim() : fisCode

  // Extract name - the main cell with athlete name
  const nameMatch = rowHtml.match(/<div class="g-lg g-md g-sm g-xs justify-left[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/)
  const name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : 'Unknown'

  // Extract nation
  const nationMatch = rowHtml.match(/<span class="country__name-short">([^<]+)<\/span>/)
  const nation = nationMatch ? nationMatch[1].trim() : ''

  // Extract birth year
  const birthMatch = rowHtml.match(/(\d{2}-\d{2}-\d{4})/)
  const birthYear = birthMatch ? birthMatch[1] : null

  console.log(`Found athlete: ${name} (competitorId: ${competitorId}, FIS code: ${actualFisCode})`)

  return { competitorId, name, nation, fisCode: actualFisCode, birthYear }
}

/**
 * Step 2: Get athlete profile info (birth date, etc.) from the biography page.
 */
async function getAthleteProfile(competitorId: string, sectorCode: string): Promise<{
  birthDate: string | null
  name: string
  nation: string
  fisCode: string
}> {
  const url = `https://www.fis-ski.com/DB/general/athlete-biography.html?sectorcode=${sectorCode}&competitorid=${competitorId}`
  console.log(`Fetching athlete profile: ${url}`)

  const response = await fetch(url, { headers: FETCH_HEADERS })
  if (!response.ok) return { birthDate: null, name: 'Unknown', nation: '', fisCode: '' }

  const html = await response.text()

  // Extract name
  const nameMatch = html.match(/<h1[^>]*class="athlete-profile__name"[^>]*>([\s\S]*?)<\/h1>/)
  let name = 'Unknown'
  if (nameMatch) {
    name = nameMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }

  // Extract birth date
  const birthMatch = html.match(/Birthdate[\s\S]*?(\d{2}-\d{2}-\d{4})/)
  const birthDate = birthMatch ? parseDate(birthMatch[1]) : null

  // Extract nation
  const nationMatch = html.match(/class="athlete-profile__country-name[^"]*">([^<]+)/)
  const nation = nationMatch ? nationMatch[1].trim() : ''

  // Extract FIS code
  const fisCodeMatch = html.match(/FIS Code[\s\S]*?(\d{5,})/)
  const fisCode = fisCodeMatch ? fisCodeMatch[1] : ''

  return { birthDate, name, nation, fisCode }
}

/**
 * Step 3: Load results via the AJAX endpoint used by the FIS website.
 */
async function loadResults(competitorId: string, sectorCode: string, limit = 100): Promise<FisResult[]> {
  const url = `https://data.fis-ski.com/fis_athletes/ajax/athletesfunctions/load_results.html?sectorcode=${sectorCode}&competitorid=${competitorId}&limit=${limit}`
  console.log(`Loading results: ${url}`)

  const response = await fetch(url, {
    headers: {
      ...FETCH_HEADERS,
      'Referer': `https://www.fis-ski.com/DB/general/athlete-biography.html?sectorcode=${sectorCode}&competitorid=${competitorId}&type=result`,
    },
  })

  if (!response.ok) {
    console.log(`Results request failed with status ${response.status}`)
    return []
  }

  const html = await response.text()
  return parseResultsFromHtml(html)
}

function parseResultsFromHtml(html: string): FisResult[] {
  const results: FisResult[] = []

  const rowRegex = /<a\s+class="table-row"[^>]*>([\s\S]*?)<\/a>/g
  let match

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1]

    // Extract date
    const dateMatch = rowHtml.match(/<div class="g-xs-4 g-sm-4 g-md-4 g-lg-4 justify-left">([^<]+)<\/div>/)
    if (!dateMatch) continue
    const date = parseDate(dateMatch[1])

    // Extract place
    const placeMatch = rowHtml.match(/<div class="g-md g-lg justify-left hidden-sm-down">([^<]+)<\/div>/)
    const place = placeMatch ? placeMatch[1].trim() : ''

    // Extract nation
    const nationMatch = rowHtml.match(/<span class="country__name-short">([^<]+)<\/span>/)
    const nation = nationMatch ? nationMatch[1].trim() : ''

    // Extract category short (hidden-sm-up)
    const catShortMatch = rowHtml.match(/<div class="g-xs-24 justify-left hidden-sm-up">([^<]+)<\/div>/)
    const categoryShort = catShortMatch ? catShortMatch[1].trim() : ''

    // Extract category full (hidden-sm-down in category column)
    const catFullMatch = rowHtml.match(/<div class="g-md-5 g-lg-5 justify-left hidden-sm-down">([^<]+)<\/div>/)
    const categoryFull = catFullMatch ? catFullMatch[1].trim() : categoryShort

    // Extract discipline
    const discMatch = rowHtml.match(/<div class="g-md-3 g-lg-3 justify-left hidden-sm-down">([^<]+)<\/div>/)
    const discipline = discMatch ? discMatch[1].trim() : ''

    // Extract position
    const posMatch = rowHtml.match(/<div class="g-xs-24 g-sm g-md g-lg justify-right">([^<]*)<\/div>/)
    const position = posMatch ? parseNumber(posMatch[1]) : null

    // Extract FIS points and cup points
    const ptsMatches = [...rowHtml.matchAll(/<div class="g-xs-24 g-sm-8 g-md-8 g-lg-8 justify-right">([^<]*)<\/div>/g)]
    const fisPoints = ptsMatches.length >= 1 ? parseNumber(ptsMatches[0][1]) : null
    const cupPoints = ptsMatches.length >= 2 ? parseNumber(ptsMatches[1][1]) : null

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { competitorId, sectorCode } = await req.json()

    if (!competitorId) {
      return new Response(
        JSON.stringify({ success: false, error: 'competitorId (FIS code) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sector = sectorCode || 'SB'
    const fisCode = competitorId.toString().trim()

    // Step 1: Search for the athlete by FIS code to get the internal competitor ID
    const searchResult = await searchAthleteByFisCode(fisCode, sector)

    if (!searchResult) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            name: 'Unknown',
            fisCode: fisCode,
            nation: '',
            birthDate: null,
            results: [],
          },
          message: `No athlete found with FIS code ${fisCode} in sector ${sector}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Get profile info (birth date)
    const profile = await getAthleteProfile(searchResult.competitorId, sector)

    // Step 3: Load competition results via the AJAX endpoint
    const results = await loadResults(searchResult.competitorId, sector)

    const athleteInfo: FisAthleteInfo = {
      name: profile.name !== 'Unknown' ? profile.name : searchResult.name,
      fisCode: profile.fisCode || searchResult.fisCode,
      nation: profile.nation || searchResult.nation,
      birthDate: profile.birthDate,
      results,
    }

    console.log(`Parsed ${results.length} results for ${athleteInfo.name}`)

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
