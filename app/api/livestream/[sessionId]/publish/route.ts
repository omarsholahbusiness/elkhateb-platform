import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { sessionId } = resolvedParams;
        const { userId, user } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = user?.role === "ADMIN";
        const isTeacher = user?.role === "TEACHER";

        if (!isTeacher && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { isPublished } = await req.json();

        // Get the existing livestream
        const existingLivestream = await db.liveSession.findUnique({
            where: { id: sessionId },
            include: {
                courses: {
                    include: {
                        course: {
                            select: {
                                userId: true
                            }
                        }
                    }
                }
            }
        });

        if (!existingLivestream) {
            return NextResponse.json({ error: "Livestream not found" }, { status: 404 });
        }

        // Check if teacher owns at least one course (unless admin)
        if (!isAdmin) {
            const ownsCourse = existingLivestream.courses.some(sc => sc.course.userId === userId);
            if (!ownsCourse) {
                return NextResponse.json({ error: "Unauthorized: You don't own this livestream" }, { status: 403 });
            }
        }

        // Update the publish status
        const updatedLivestream = await db.liveSession.update({
            where: { id: sessionId },
            data: {
                isPublished: isPublished === true || isPublished === "true"
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
            }
        });

        // Format the response
        const formattedLivestream = {
            ...updatedLivestream,
            courses: updatedLivestream.courses.map(sc => sc.course)
        };

        return NextResponse.json(formattedLivestream);
    } catch (error) {
        console.error("[LIVESTREAM_PUBLISH_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
