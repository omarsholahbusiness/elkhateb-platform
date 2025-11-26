import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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

        // Get the livestream
        const livestream = await db.liveSession.findUnique({
            where: { id: sessionId },
            include: {
                courses: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                userId: true
                            }
                        }
                    }
                }
            }
        });

        if (!livestream) {
            return NextResponse.json({ error: "Livestream not found" }, { status: 404 });
        }

        // Check access: teachers/admins can see their own, students need course access
        if (isTeacher || isAdmin) {
            // Teachers can only see livestreams for their courses (unless admin)
            if (!isAdmin) {
                const ownsCourse = livestream.courses.some(sc => sc.course.userId === userId);
                if (!ownsCourse) {
                    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
                }
            }
        } else {
            // Students need to have access to at least one course
            const courseIds = livestream.courses.map(sc => sc.courseId);
            
            // Check if user has purchased any of the courses or if they're free
            const courses = await db.course.findMany({
                where: {
                    id: { in: courseIds },
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

            const hasAccess = courses.some(course => {
                const isFree = course.price === 0 || course.price === null;
                const hasPurchase = course.purchases.length > 0;
                return isFree || hasPurchase;
            });

            // Also check if session is free and published
            const sessionIsAccessible = livestream.isPublished && (
                livestream.isFree || hasAccess
            );

            if (!sessionIsAccessible) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        // Format the response
        const formattedLivestream = {
            ...livestream,
            courses: livestream.courses.map(sc => ({
                id: sc.course.id,
                title: sc.course.title
            }))
        };

        return NextResponse.json(formattedLivestream);
    } catch (error) {
        console.error("[LIVESTREAM_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

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

        const { title, description, linkUrl, linkType, startDate, endDate, isFree, courseIds, chapterId } = await req.json();

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

        // Validate courseIds if provided
        if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
            const courses = await db.course.findMany({
                where: {
                    id: {
                        in: courseIds
                    }
                },
                select: {
                    id: true,
                    userId: true
                }
            });

            if (courses.length !== courseIds.length) {
                return NextResponse.json({ error: "One or more courses not found" }, { status: 404 });
            }

            // Check if teacher owns all courses (unless admin)
            if (!isAdmin) {
                const unauthorizedCourse = courses.find(course => course.userId !== userId);
                if (unauthorizedCourse) {
                    return NextResponse.json({ error: "Unauthorized: You don't own one or more courses" }, { status: 403 });
                }
            }
        }

        // Validate chapter if provided
        if (chapterId) {
            const chapter = await db.chapter.findUnique({
                where: { id: chapterId },
                select: { id: true, courseId: true }
            });

            if (!chapter) {
                return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
            }

            // Verify chapter belongs to one of the courses
            const finalCourseIds = courseIds || existingLivestream.courses.map(sc => sc.courseId);
            if (!finalCourseIds.includes(chapter.courseId)) {
                return NextResponse.json({ error: "Chapter must belong to one of the selected courses" }, { status: 400 });
            }
        }

        // Validate linkType if provided
        if (linkType && !["ZOOM", "GOOGLE_MEET"].includes(linkType)) {
            return NextResponse.json({ error: "Link type must be ZOOM or GOOGLE_MEET" }, { status: 400 });
        }

        // Update the livestream
        const updateData: any = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (linkUrl !== undefined) updateData.linkUrl = linkUrl.trim();
        if (linkType !== undefined) updateData.linkType = linkType;
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
        if (isFree !== undefined) updateData.isFree = isFree;
        if (chapterId !== undefined) updateData.chapterId = chapterId || null;

        // Update course relationships if courseIds provided
        if (courseIds && Array.isArray(courseIds)) {
            // Delete existing relationships
            await db.liveSessionCourse.deleteMany({
                where: { liveSessionId: sessionId }
            });

            // Create new relationships
            await db.liveSessionCourse.createMany({
                data: courseIds.map((courseId: string) => ({
                    liveSessionId: sessionId,
                    courseId
                }))
            });
        }

        const updatedLivestream = await db.liveSession.update({
            where: { id: sessionId },
            data: updateData,
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
        console.error("[LIVESTREAM_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
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

        // Delete the livestream (cascade will handle related records)
        await db.liveSession.delete({
            where: { id: sessionId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[LIVESTREAM_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}