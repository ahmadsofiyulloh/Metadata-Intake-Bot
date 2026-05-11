export default async function handler(_req: any, res: any): Promise<void> {
  res.status(200).json({
    ok: true,
    service: "metadata-intake-bot",
    timestamp: new Date().toISOString()
  });
}
