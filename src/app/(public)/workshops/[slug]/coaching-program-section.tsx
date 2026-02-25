import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Video, MessageSquare, CheckCircle, Sparkles } from "lucide-react";

export function CoachingProgramSection() {
  return (
    <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-background overflow-hidden">
      <CardContent className="pt-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs">
              Virtual Program
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
              Enrolling Now
            </Badge>
          </div>
          <h2 className="text-xl font-bold">3-Month Runway Coaching Program</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Personal 1-on-1 coaching from our professional team — get runway-ready for Miami Swim Week 2026 from anywhere in the world. Select the <strong className="text-foreground">3-Month Coaching</strong> tab in the checkout to enroll.
          </p>
        </div>

        {/* What's included */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: <Video className="h-4 w-4" />, text: "Bi-weekly runway video submissions" },
            { icon: <MessageSquare className="h-4 w-4" />, text: "Personalized 1-on-1 feedback each round" },
            { icon: <CheckCircle className="h-4 w-4" />, text: "Walk, posture, turns & expression coaching" },
            { icon: <Sparkles className="h-4 w-4" />, text: "Direct line to our coaching team each month" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-violet-400 mt-0.5 flex-shrink-0">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Monthly timeline */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { month: "Month 1", focus: "Foundation — posture, stride & alignment" },
            { month: "Month 2", focus: "Performance — turns, transitions & expression" },
            { month: "Month 3", focus: "Polish — full run-through & show prep" },
          ].map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-center"
            >
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">{m.month}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.focus}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          $125/mo × 3 months ($375 total) or pay in full for $350 — select the tab in the checkout card.
        </p>
      </CardContent>
    </Card>
  );
}
