import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all livestreams for courses owned by this teacher
        const livestreams = await db.liveSession.findMany({
            where: {
                courses: {
                    some: {
                        course: {
                            userId: userId
                        }
                    }
                }
            },
            include: {
                courses: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true
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
        console.error("[LIVESTREAM_TEACHER_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
