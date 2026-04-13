/**
 * Storage abstraction: S3_BUCKET 환경변수가 있으면 S3, 없으면 로컬 파일
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const bucket = (process.env.S3_BUCKET || "").trim();
const region = (process.env.S3_REGION || "ap-northeast-2").trim();
const prefix = (process.env.S3_PREFIX || "").trim();

function useS3() { return bucket.length > 0; }

function s3Key(filePath) {
  // filePath는 절대경로 or 상대경로 → key만 추출
  const base = filePath.replace(/^.*?\/data\//, "data/").replace(/^.*?\/config\//, "config/");
  return prefix ? `${prefix}/${base}` : base;
}

let _s3Client = null;
async function getS3Client() {
  if (!_s3Client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    _s3Client = new S3Client({ region });
  }
  return _s3Client;
}

export async function storageRead(filePath) {
  if (!useS3()) {
    return JSON.parse(await readFile(filePath, "utf8"));
  }
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key(filePath) }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function storageWrite(filePath, data) {
  const body = JSON.stringify(data, null, 2);
  if (!useS3()) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body, "utf8");
    return;
  }
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key(filePath),
    Body: body,
    ContentType: "application/json"
  }));
}
