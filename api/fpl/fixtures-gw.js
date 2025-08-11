// GET /api/fpl/fixtures-gw?event=next   or   /api/fpl/fixtures-gw?event=1
// -> { event, count, fixtures: [{id, team_h, team_a, team_h_difficulty, team_a_difficulty, kickoff_time}] }
module.exports = async function (req, res) {
  try {
    // Parse query safely (works on Vercel Node without req.query)
    const qs = req.url.includes("?") ? req.url.split("?")[1] : "";
    const params = new URLSearchParams(qs);
    const eventRaw = String((params.get("event") || "next")).trim().toLowerCase();

    const headers = { "User-Agent": "FPL-Assistant/1.0 (+contact:you@example.com)" };
    const [boot, allFix] = await Promise.all([
      fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { headers }).then(r => r.json()),
      fetch("https://fantasy.premierleague.com/api/fixtures/", { headers }).then(r => r.json())
    ]);

    // Decide GW
    let gw;
    if (eventRaw === "next") {
      const ev = (boot.events || []);
      const next = ev.find(e => e.is_next) || ev.find(e => !e.finished && !e.data_checked) || ev[0];
      gw = next ? next.id : 1;
    } else {
      const n = Number(eventRaw);
      gw = Number.isFinite(n) && n > 0 ? n : 1;
    }

    // Slice fixtures for that GW (keep payload tiny)
    const fixtures = (allFix || [])
      .filter(f => Number(f.event) === Number(gw))
      .map(f => ({
        id: f.id,
        team_h: f.team_h,
        team_a: f.team_a,
        team_h_difficulty: f.team_h_difficulty ?? f.difficulty ?? null,
        team_a_difficulty: f.team_a_difficulty ?? f.difficulty ?? null,
        kickoff_time: f.kickoff_time || null
      }));

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
    res.status(200).json({ event: gw, count: fixtures.length, fixtures });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};
