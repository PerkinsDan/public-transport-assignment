import { getPunctualityData } from "@/lib/transport/data";

export async function GET() {
  try {
    const data = await getPunctualityData();
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}