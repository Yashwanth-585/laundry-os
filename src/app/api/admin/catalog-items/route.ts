import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (
            profileError ||
            !profile ||
            profile.role !== "admin"
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            );
        }

        const body = await request.json();

        const id = body?.id;
        const price = Number(body?.price);

        if (!id) {
            return NextResponse.json(
                { error: "Catalog item ID is required." },
                { status: 400 },
            );
        }

        if (!Number.isFinite(price) || price < 0) {
            return NextResponse.json(
                { error: "Price must be a valid non-negative number." },
                { status: 400 },
            );
        }

        const { data, error } = await supabase
            .from("catalog_items")
            .update({
                price: price.toFixed(2),
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select("id, category, name, price, is_active")
            .single();

        if (error) {
            console.error("CATALOG PRICE UPDATE ERROR:", error);

            return NextResponse.json(
                { error: "Failed to update catalog item price." },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            item: data,
        });
    } catch (error) {
        console.error("ADMIN CATALOG API ERROR:", error);

        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 },
        );
    }
}