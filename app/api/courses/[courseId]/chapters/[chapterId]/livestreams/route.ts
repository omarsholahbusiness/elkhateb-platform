import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { courseId, chapterId } = resolvedParams;
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify course access
        const course = await db.course.findUnique({
            where: {
                id: courseId,
                isPublished: true
            },
            include: {
                purchases: {
                    where: {
                        userId,
                        status: "ACTIVE"
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Check if user has access
        const isFreeCourse = course.price === 0 || course.price === null;
        const hasPurchase = course.purchases.length > 0;
        const hasAccess = isFreeCourse || hasPurchase;

        if (!hasAccess) {
            return NextResponse.json({ error: "You don't have access to this course" }, { status: 403 });
        }

        const now = new Date();

        // Get published livestreams linked to this chapter
        const livestreams = await db.liveSession.findMany({
            where: {
                isPublished: true,
                chapterId: chapterId,
                courses: {
                    some: {
                        courseId: courseId
                    }
                },
                OR: [
                    {
                        AND: [
                            { startDate: { lte: now } },
                            {
                                OR: [
                                    { endDate: null },
                                    { endDate: { gt: now } }
                                ]
                            }
                        ]
                    },
                    { startDate: { gte: now } }
                ]
            },
            orderBy: {
                startDate: "asc"
            }
        });

        // Filter by access
        const accessibleLivestreams = livestreams.filter(session => {
            if (session.isFree) {
                return true;
            }
            return hasPurchase;
        });

        // Determine status for each session
        const sessionsWithStatus = accessibleLivestreams.map(session => {
            const sessionStart = new Date(session.startDate);
            const sessionEnd = session.endDate ? new Date(session.endDate) : null;

            let status: "not_started" | "active" | "ended";
            if (now < sessionStart) {
                status = "not_started";
            } else if (sessionEnd && now > sessionEnd) {
                status = "ended";
            } else {
                status = "active";
            }

            return {
                ...session,
                status
            };
        });

        return NextResponse.json(sessionsWithStatus);
    } catch (error) {
        console.error("[CHAPTER_LIVESTREAMS_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
