import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            image: true,
          }
        },
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Return courses with default progress of 0 for public view
    const coursesWithDefaultProgress = courses.map(course => ({
      ...course,
      progress: 0
    }));

    return NextResponse.json(coursesWithDefaultProgress);
  } catch (error) {
    console.error("[COURSES_PUBLIC] Error details:", error);
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("[COURSES_PUBLIC] Error message:", error.message);
      console.error("[COURSES_PUBLIC] Error stack:", error.stack);
    }
    
    // If the table doesn't exist or there's a database connection issue,
    // return an empty array instead of an error
    if (error instanceof Error && (
      error.message.includes("does not exist") || 
      error.message.includes("P2021") ||
      error.message.includes("table") ||
      error.message.includes("Can't reach database server") ||
      error.message.includes("Connection") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("ETIMEDOUT")
    )) {
      console.log("[COURSES_PUBLIC] Database connection issue, returning empty array");
      return NextResponse.json([]);
    }
    
    // Return error details in development for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to fetch courses",
        message: process.env.NODE_ENV === "development" ? errorMessage : "Internal server error"
      },
      { status: 500 }
    );
  }
} 