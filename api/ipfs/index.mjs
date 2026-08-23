import { readIpfsIndex } from "../_lib.mjs";

export default function handler(req, res) {
  try {
    const md = readIpfsIndex();
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    return res.status(200).send(md);
  } catch (e) {
    return res.status(404).json({ error: "IPFS index not found", details: String(e?.message || e) });
  }
}
