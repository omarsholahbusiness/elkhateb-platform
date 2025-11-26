import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { fullName, phoneNumber, parentPhoneNumber, password, confirmPassword } = await req.json();

    if (!fullName || !phoneNumber || !parentPhoneNumber || !password || !confirmPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    // Check if phone number is the same as parent phone number
    if (phoneNumber === parentPhoneNumber) {
      return NextResponse.json({ error: "Phone number cannot be the same as parent phone number" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { parentPhoneNumber }
        ]
      },
    });

    if (existingUser) {
      if (existingUser.phoneNumber === phoneNumber) {
        return NextResponse.json({ error: "Phone number already exists" }, { status: 400 });
      }
      if (existingUser.parentPhoneNumber === parentPhoneNumber) {
        return NextResponse.json({ error: "Parent phone number already exists" }, { status: 400 });
      }
    }

    // Hash password (no complexity requirements)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user directly without email verification
    await db.user.create({
      data: {
        fullName,
        phoneNumber,
        parentPhoneNumber,
        hashedPassword,
        role: "USER",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    
    // If the table doesn't exist or there's a database connection issue,
    // return a specific error message
    if (error instanceof Error) {
      // Database connection errors
      if (
        error.message.includes("does not exist") || 
        error.message.includes("P2021") ||
        error.message.includes("table") ||
        error.message.includes("P1001") ||
        error.message.includes("Can't reach database")
      ) {
        return NextResponse.json({ error: "Database not initialized. Please run database migrations." }, { status: 503 });
      }
      
      // Prisma validation errors
      if (error.message.includes("P2002") || error.message.includes("Unique constraint")) {
        return NextResponse.json({ error: "Phone number or parent phone number already exists" }, { status: 400 });
      }
      
      // Return the actual error message for debugging
      return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 });
    }
    
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
} 