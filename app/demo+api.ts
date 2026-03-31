import { db } from "@/lib/db";
import { test } from "@/lib/db/schema";

export async function GET() {
    const res = await db.insert(test).values({ test: "Hello, world!" });


    return Response.json({ message: "Hello, world!", res });
}
