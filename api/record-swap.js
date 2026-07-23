import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { address, volumeUsd } = req.body || {};

    if (!address || typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Alamat wallet tidak valid" });
    }

    const vol = Number(volumeUsd);
    if (!Number.isFinite(vol) || vol < 0) {
      return res.status(400).json({ error: "volumeUsd tidak valid" });
    }

    const cappedVol = Math.min(vol, 10000000);

    const addrKey = address.toLowerCase();
    const volScoreDelta = Math.round(cappedVol * 100);

    const [newCount, newVolumeScore] = await Promise.all([
      redis.zincrby("leaderboard:count", 1, addrKey),
      redis.zincrby("leaderboard:volume", volScoreDelta, addrKey),
    ]);

    return res.status(200).json({
      ok: true,
      address: addrKey,
      totalSwaps: newCount,
      totalVolumeUsd: Number(newVolumeScore) / 100,
    });
  } catch (err) {
    console.error("record-swap error:", err);
    return res.status(500).json({ error: "Gagal mencatat swap" });
  }
}
