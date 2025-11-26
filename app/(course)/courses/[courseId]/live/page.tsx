"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LiveSession {
    id: string;
    title: string;
    description: string | null;
    linkUrl: string;
    linkType: "ZOOM" | "GOOGLE_MEET";
    startDate: string;
    endDate: string | null;
    isFree: boolean;
    status: "not_started" | "active" | "ended";
}

export default function CourseLivePage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const router = useRouter();
    const { courseId } = use(params);
    const [livestreams, setLivestreams] = useState<LiveSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLivestreams();
    }, [courseId]);

    const fetchLivestreams = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/live`);
            const data = await response.json();
            
            if (response.ok) {
                setLivestreams(data || []);
            } else if (response.status === 404) {
                toast.error("الكورس غير موجود");
                // Don't redirect immediately, let the user see the error
                setLivestreams([]);
            } else if (response.status === 401) {
                toast.error("يرجى تسجيل الدخول");
                router.push("/sign-in");
            } else {
                console.error("API Error:", data);
                toast.error(data.error || "حدث خطأ أثناء جلب الجلسات");
                setLivestreams([]);
            }
        } catch (error) {
            console.error("Error fetching livestreams:", error);
            toast.error("حدث خطأ أثناء جلب الجلسات");
            setLivestreams([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const handleJoin = (session: LiveSession) => {
        if (session.status === "active") {
            window.open(session.linkUrl, "_blank", "noopener,noreferrer");
        }
    };

    const getStatusBadge = (status: "not_started" | "active" | "ended") => {
        switch (status) {
            case "not_started":
                return <Badge variant="secondary">لم تبدأ بعد</Badge>;
            case "active":
                return <Badge variant="default" className="bg-green-500">جاري البث</Badge>;
            case "ended":
                return <Badge variant="secondary">انتهت</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="h-full">
            <div className="max-w-5xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">جلسات البث المباشر</h1>
                    <Button variant="outline" onClick={() => router.push("/dashboard")}>
                        العودة إلى لوحة التحكم
                    </Button>
                </div>

                {livestreams.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">لا توجد جلسات بث مباشر متاحة حالياً</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {livestreams.map((session) => (
                            <Card key={session.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="mb-2">{session.title}</CardTitle>
                                            {session.description && (
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {session.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>البدء: {formatDate(session.startDate)}</span>
                                                </div>
                                                {session.endDate && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>الانتهاء: {formatDate(session.endDate)}</span>
                                                    </div>
                                                )}
                                                <Badge variant="outline">
                                                    {session.linkType === "ZOOM" ? "Zoom" : "Google Meet"}
                                                </Badge>
                                                {session.isFree && (
                                                    <Badge variant="default">مجاني</Badge>
                                                )}
                                            </div>
                                        </div>
                                        {getStatusBadge(session.status)}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        onClick={() => handleJoin(session)}
                                        disabled={session.status !== "active"}
                                        className={`w-full sm:w-auto ${session.status === "active" ? "bg-brand hover:bg-brand/90 text-white" : ""}`}
                                    >
                                        {session.status === "not_started" && "لم تبدأ بعد"}
                                        {session.status === "active" && (
                                            <>
                                                <ExternalLink className="h-4 w-4 ml-2" />
                                                انضم إلى البث
                                            </>
                                        )}
                                        {session.status === "ended" && "انتهت الجلسة"}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
