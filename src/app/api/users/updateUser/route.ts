import { NextResponse } from "next/server";
import { PlanType } from "@prisma/client";
import prisma from "@/app/lib/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function POST(req: Request) {
  try {
    const session = getKindeServerSession();
    const user = await session.getUser();

    if (!user || !user.id) {
      return NextResponse.json(
        { message: "User not authenticated or missing user ID" },
        { status: 400 }
      );
    }

    const { userId, planType, planEndTime, isActive } = await req.json();

    const targetUserRecord = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!targetUserRecord) {
      return NextResponse.json(
        { message: "Target user not found in the database" },
        { status: 404 }
      );
    }

    let updateData: Partial<typeof targetUserRecord> = {};

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
      if (!isActive) {
        updateData.planType = "Expired";
        updateData.planEndTime = null;
      }
    }

    if (isActive && planType) {
      if (Object.values(PlanType).includes(planType)) {
        updateData.planType = planType as PlanType;
      } else {
        return NextResponse.json(
          { message: `Invalid planType provided: ${planType}` },
          { status: 400 }
        );
      }
    }

    if (isActive && planEndTime) {
      const validDate = !isNaN(new Date(planEndTime).getTime());
      if (validDate) {
        updateData.planEndTime = new Date(planEndTime);
      } else {
        return NextResponse.json(
          { message: `Invalid planEndTime provided: ${planEndTime}` },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No fields updated" }, { status: 200 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error:any) {
    console.error("Error updating user:", error.message);
    
   return NextResponse.json(
      { message: `Failed to update user due to error` },
      { status: 500 }
   );
  }
}

export function GET() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}