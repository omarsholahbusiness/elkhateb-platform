import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
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

        // Validate required fields
        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        if (!linkUrl || !linkUrl.trim()) {
            return NextResponse.json({ error: "Link URL is required" }, { status: 400 });
        }

        if (!linkType || !["ZOOM", "GOOGLE_MEET"].includes(linkType)) {
            return NextResponse.json({ error: "Link type must be ZOOM or GOOGLE_MEET" }, { status: 400 });
        }

        if (!startDate) {
            return NextResponse.json({ error: "Start date is required" }, { status: 400 });
        }

        if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
            return NextResponse.json({ error: "At least one course is required" }, { status: 400 });
        }

        // Verify all courses exist and belong to the teacher (unless admin)
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

        // Validate chapter if provided
        if (chapterId) {
            const chapter = await db.chapter.findUnique({
                where: { id: chapterId },
                select: { id: true, courseId: true }
            });

            if (!chapter) {
                return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
            }

            // Verify chapter belongs to one of the selected courses
            if (!courseIds.includes(chapter.courseId)) {
                return NextResponse.json({ error: "Chapter must belong to one of the selected courses" }, { status: 400 });
            }
        }

        // Create the livestream session
        const livestream = await db.liveSession.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                linkUrl: linkUrl.trim(),
                linkType,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                isFree: isFree || false,
                chapterId: chapterId || null,
                courses: {
                    create: courseIds.map((courseId: string) => ({
                        courseId
                    }))
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
            }
        });

        // Format the response
        const formattedLivestream = {
            ...livestream,
            courses: livestream.courses.map(sc => sc.course)
        };

        return NextResponse.json(formattedLivestream);
    } catch (error) {
        console.error("[LIVESTREAM_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
