// GET /api/fpl/fixtures-gw?event=next  OR  /api/fpl/fixtures-gw?event=1
// -> { event: <id>, fixtures: [ {team_h, team_a, team_h_difficulty, team_a_difficulty, kickoff_time} ] }
module.exports = async function (req, res) {
  try {
    const base = new URL(req.url, `http://${req.headers.host}`);
    const eventParam = (base.searchParams.get("event") || "next").toLowerCase();

    const headers = { "User-Agent": "FPL-Assistant/1.0 (+contact:you@example.com)" };
    const [boot, allFix] = await Promise.all([
      fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { headers }).then(r=>r.json()),
      fetch("https://fantasy.premierleague.com/api/fixtures/", { headers }).then(r=>r.json())
    ]);

    let gw;
    if (eventParam === "next") {
      const next = (boot.events || []).find(e => e.is_next) || (boot.events || []).find(e => !e.finished && !e.data_checked);
      gw = next ? next.id : 1;
    } else {
      gw = Number(eventParam) || 1;
    }

    const slice = (allFix || []).filter(f => f.event === gw).map(f => ({
      team_h: f.team_h, team_a: f.team_a,
      team_h_difficulty: f.team_h_difficulty ?? f.difficulty ?? null,
      team_a_difficulty: f.team_a_difficulty ?? f.difficulty ?? null,
      kickoff_time: f.kickoff_time
    }));

    res.setHeader("Cache-Control","s-maxage=900, stale-while-revalidate=86400");
    res.status(200).json({ event: gw, fixtures: slice });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};
