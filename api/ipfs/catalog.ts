import { readIpfsIndex, parseIpfsCatalog } from "../_lib";

export default function handler(req: any, res: any) {
  try {
    return res.status(200).json(parseIpfsCatalog(readIpfsIndex()));
  } catch (e: any) {
    return res.status(404).json({ error: "IPFS index not found", details: String(e?.message || e) });
  }
}
