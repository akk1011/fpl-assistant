// CommonJS for Vercel Node runtime
module.exports = async function (req, res) {
  try {
    if ((req.method || "GET") !== "POST") {
      res.status(405).json({ error: "Use POST with { ids:number[], gw?:number }" });
      return;
    }
    const body = await readJson(req);
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : [];
    if (!ids.length) {
      res.status(400).json({ error: "Provide player element ids in 'ids' array" });
      return;
    }

    const headers = { "User-Agent": "FPL-Assistant/1.0 (+contact:you@example.com)" };
    const [bootstrap, fixtures] = await Promise.all([
      fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { headers }).then(r=>r.json()),
      fetch("https://fantasy.premierleague.com/api/fixtures/", { headers }).then(r=>r.json())
    ]);

    const events = bootstrap.events || [];
    const nextEvent = typeof body.gw === "number"
      ? events.find(e => e.id === Number(body.gw))
      : events.find(e => e.is_next) || events.find(e => !e.finished && !e.data_checked);
    const gw = nextEvent ? nextEvent.id : (events.at?.(-1)?.id || 1);

    const byId = new Map(bootstrap.elements.map(p => [p.id, p]));

    // Build opponent & difficulty map for this GW
    const thisGw = fixtures.filter(f => f.event === gw);
    const oppMap = new Map(); // teamId -> { opponent_team, difficulty }
    for (const f of thisGw) {
      if (f.team_h && f.team_a) {
        oppMap.set(f.team_h, { opponent_team: f.team_a, difficulty: f.team_h_difficulty ?? f.difficulty ?? 3 });
        oppMap.set(f.team_a, { opponent_team: f.team_h, difficulty: f.team_a_difficulty ?? f.difficulty ?? 3 });
      }
    }

    const statusMinutes = (s) => (s==="a"?85 : s==="d"?45 : 0);
    const diffMult = (d) => d<=1?1.15 : d===2?1.10 : d===3?1.00 : d===4?0.92 : 0.85;
    const roleBonus = (etype, d) => ((etype===1||etype===2) && d<=2) ? 0.3 : 0; // tiny CS proxy for GK/DEF

    const results = ids.map(id => {
      const p = byId.get(id);
      if (!p) return { id, ep:0, exp_minutes:0, fixture:null, notes:"Unknown id" };
      const teamId = p.team;
      const opp = oppMap.get(teamId) || { opponent_team:null, difficulty:5 };
      const minutes = statusMinutes(p.status);
      const form = Number(p.form || 0);
      const ppg  = Number(p.points_per_game || 0);
      const base = 0.6*form + 0.4*ppg;
      const ep = Number(((base * (minutes/90)) * diffMult(opp.difficulty) + roleBonus(p.element_type, opp.difficulty)).toFixed(2));
      const notes = p.status==="d" ? "Doubtful" : (p.status==="a" ? "Available" : "Out/Unavailable");
      return { id, ep, exp_minutes: minutes, fixture: { opponent_team: opp.opponent_team, difficulty: opp.difficulty }, notes };
    });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
    res.status(200).json({ gw, results });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};

async function readJson(req){
  const chunks=[]; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
