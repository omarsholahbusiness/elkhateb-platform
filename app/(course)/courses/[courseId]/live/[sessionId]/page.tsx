"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ExternalLink, ArrowRight } from "lucide-react";
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
}

export default function LiveSessionPage({
    params,
}: {
    params: Promise<{ courseId: string; sessionId: string }>;
}) {
    const router = useRouter();
    const { courseId, sessionId } = use(params);
    const [session, setSession] = useState<LiveSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSession();
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const response = await fetch(`/api/livestream/${sessionId}`);
            if (response.ok) {
                const data = await response.json();
                setSession(data);
            } else if (response.status === 403) {
                toast.error("ليس لديك صلاحية للوصول إلى هذه الجلسة");
                router.push(`/courses/${courseId}/live`);
            } else if (response.status === 404) {
                toast.error("الجلسة غير موجودة");
                router.push(`/courses/${courseId}/live`);
            } else {
                toast.error("حدث خطأ أثناء جلب الجلسة");
            }
        } catch (error) {
            console.error("Error fetching session:", error);
            toast.error("حدث خطأ أثناء جلب الجلسة");
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

    const handleJoin = () => {
        window.open(session?.linkUrl, "_blank", "noopener,noreferrer");
    };

    const LiveEmbed = () => {
        if (!session) return null;

        // For Zoom and Google Meet, show a button to open in new tab
        if (session.linkType === "ZOOM" || session.linkType === "GOOGLE_MEET") {
            return (
                <div className="flex items-center justify-center min-h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="text-center space-y-4">
                        <h3 className="text-xl font-semibold">
                            {session.linkType === "ZOOM" ? "جلسة Zoom" : "جلسة Google Meet"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            اضغط على الزر أدناه للانضمام إلى الجلسة
                        </p>
                        <Button size="lg" onClick={handleJoin} className="flex items-center gap-2">
                            <ExternalLink className="h-5 w-5" />
                            انضم إلى الجلسة
                        </Button>
                    </div>
                </div>
            );
        }

        // For other link types, use iframe
        return (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                <iframe
                    src={session.linkUrl}
                    className="w-full h-full"
                    allow="camera; microphone; fullscreen"
                    allowFullScreen
                    title={session.title}
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">جاري التحميل...</div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-muted-foreground">الجلسة غير موجودة</p>
                    <Button onClick={() => router.push(`/courses/${courseId}/live`)}>
                        العودة إلى الجلسات
                    </Button>
                </div>
            </div>
        );
    }

    const now = new Date();
    const startDate = new Date(session.startDate);
    const endDate = session.endDate ? new Date(session.endDate) : null;
    const isActive = now >= startDate && (!endDate || now <= endDate);

    return (
        <div className="h-full">
            <div className="max-w-5xl mx-auto p-6">
                <div className="space-y-6">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/courses/${courseId}/live`)}
                        className="flex items-center gap-2"
                    >
                        <ArrowRight className="h-4 w-4" />
                        العودة إلى الجلسات
                    </Button>

                    {/* Title */}
                    <div className="text-center">
                        <h1 className="text-3xl font-bold mb-4">{session.title}</h1>
                        {session.description && (
                            <p className="text-muted-foreground mb-4">{session.description}</p>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>البدء: {formatDate(session.startDate)}</span>
                            </div>
                            {endDate && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>الانتهاء: {formatDate(session.endDate!)}</span>
                                </div>
                            )}
                            <Badge variant="outline">
                                {session.linkType === "ZOOM" ? "Zoom" : "Google Meet"}
                            </Badge>
                            {session.isFree && <Badge variant="default">مجاني</Badge>}
                            {isActive ? (
                                <Badge variant="default" className="bg-green-500">جاري البث</Badge>
                            ) : now < startDate ? (
                                <Badge variant="secondary">لم تبدأ بعد</Badge>
                            ) : (
                                <Badge variant="secondary">انتهت</Badge>
                            )}
                        </div>
                    </div>

                    {/* Live Embed */}
                    <Card>
                        <CardContent className="p-6">
                            <LiveEmbed />
                        </CardContent>
                    </Card>

                    {/* Additional Info */}
                    {!isActive && (
                        <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                                {now < startDate ? (
                                    <p>الجلسة ستبدأ في {formatDate(session.startDate)}</p>
                                ) : (
                                    <p>الجلسة قد انتهت</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
