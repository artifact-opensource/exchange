import { readIpfsIndex, parseIpfsCatalog } from "../_lib.mjs";

export default function handler(req, res) {
  try {
    return res.status(200).json(parseIpfsCatalog(readIpfsIndex()));
  } catch (e) {
    return res.status(404).json({ error: "IPFS index not found", details: String(e?.message || e) });
  }
}
