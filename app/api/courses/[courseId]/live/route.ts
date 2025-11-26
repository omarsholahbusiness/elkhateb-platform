import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { courseId } = resolvedParams;
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify course exists and is published
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

        // Check if user has access (free course or purchased)
        const isFreeCourse = course.price === 0 || course.price === null;
        const hasPurchase = course.purchases.length > 0;
        const hasAccess = isFreeCourse || hasPurchase;

        const now = new Date();

        // Get published livestreams for this course that are accessible
        const livestreams = await db.liveSession.findMany({
            where: {
                isPublished: true,
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
                    { startDate: { gte: now } } // Include upcoming sessions
                ]
            },
            orderBy: {
                startDate: "asc"
            }
        });

        // Filter by access (free livestreams are always accessible, paid ones require course access)
        const accessibleLivestreams = livestreams.filter(session => {
            // If session is free, allow access to everyone
            if (session.isFree) {
                return true;
            }
            // If user has access to the course (free course or purchased), allow access to paid livestreams
            return hasAccess;
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
        console.error("[COURSE_LIVE_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
