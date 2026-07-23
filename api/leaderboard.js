import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
    const sortBy = req.query.sort === "volume" ? "volume" : "count";

    const primaryKey = sortBy === "volume" ? "leaderboard:volume" : "leaderboard:count";

    const top = await redis.zrange(primaryKey, 0, limit - 1, {
      rev: true,
      withScores: true,
    });

    const addresses = [];
    for (let i = 0; i < top.length; i += 2) {
      addresses.push(top[i]);
    }

    if (addresses.length === 0) {
      return res.status(200).json({
        rankedBy: sortBy,
        ranked: [],
        updatedAt: new Date().toISOString(),
      });
    }

    const [countScores, volumeScores] = await Promise.all([
      Promise.all(addresses.map((a) => redis.zscore("leaderboard:count", a))),
      Promise.all(addresses.map((a) => redis.zscore("leaderboard:volume", a))),
    ]);

    const ranked = addresses.map((address, i) => ({
      address,
      swapCount: Number(countScores[i] || 0),
      volumeUsd: Number(volumeScores[i] || 0) / 100,
      rank: i + 1,
    }));

    return res.status(200).json({
      rankedBy: sortBy,
      ranked,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("leaderboard error:", err);
    return res.status(500).json({ error: "Gagal memuat leaderboard" });
  }
}
