import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get all livestreams (admin sees everything)
        const livestreams = await db.liveSession.findMany({
            include: {
                courses: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                user: {
                                    select: {
                                        id: true,
                                        fullName: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Format the response
        const formattedLivestreams = livestreams.map(session => ({
            ...session,
            courses: session.courses.map(sc => sc.course)
        }));

        return NextResponse.json(formattedLivestreams);
    } catch (error) {
        console.error("[LIVESTREAM_ADMIN_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
