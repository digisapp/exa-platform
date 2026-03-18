"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Camera, BarChart3, User, Globe } from "lucide-react";
import type { Model } from "@/types/database";

const coinsToUSD = (coins: number) =>
  (coins * 0.10).toLocaleString("en-US", { style: "currency", currency: "USD" });

interface ModelRatesTabProps {
  model: Model;
  onChange: (model: Model) => void;
}

export function ModelRatesTab({ model, onChange }: ModelRatesTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pricing Rates</CardTitle>
          <CardDescription>
            Set your rates for video calls, voice calls, and messages. 1 coin = $0.10 USD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            {/* Video Call Rate */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-gradient-to-r from-pink-500/10 to-violet-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold">Video Call Rate</Label>
                  <p className="text-sm text-muted-foreground">Per minute (min: 10 coins)</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 pl-13 sm:pl-0">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="10"
                    max="1000"
                    value={model.video_call_rate ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        onChange({ ...model, video_call_rate: null as any });
                      } else {
                        onChange({ ...model, video_call_rate: parseInt(raw) || 0 });
                      }
                    }}
                    onBlur={() => {
                      if (!model.video_call_rate || model.video_call_rate < 10) {
                        onChange({ ...model, video_call_rate: 10 });
                      }
                    }}
                    className="w-20 text-right"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">coins/min</span>
                </div>
                {model.video_call_rate ? (
                  <span className="text-xs text-emerald-400/80">{coinsToUSD(model.video_call_rate)}/min</span>
                ) : null}
              </div>
            </div>

            {/* Voice Call Rate */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold">Voice Call Rate</Label>
                  <p className="text-sm text-muted-foreground">Per minute (min: 10 coins)</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 pl-13 sm:pl-0">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="10"
                    max="1000"
                    value={model.voice_call_rate ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        onChange({ ...model, voice_call_rate: null as any });
                      } else {
                        onChange({ ...model, voice_call_rate: parseInt(raw) || 0 });
                      }
                    }}
                    onBlur={() => {
                      if (!model.voice_call_rate || model.voice_call_rate < 10) {
                        onChange({ ...model, voice_call_rate: 10 });
                      }
                    }}
                    className="w-20 text-right"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">coins/min</span>
                </div>
                {model.voice_call_rate ? (
                  <span className="text-xs text-emerald-400/80">{coinsToUSD(model.voice_call_rate)}/min</span>
                ) : null}
              </div>
            </div>

            {/* Message Rate */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-gradient-to-r from-green-500/10 to-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold">Message Rate</Label>
                  <p className="text-sm text-muted-foreground">Per message (min: 5 coins)</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 pl-13 sm:pl-0">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="5"
                    max="100"
                    value={model.message_rate ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        onChange({ ...model, message_rate: null as any });
                      } else {
                        onChange({ ...model, message_rate: parseInt(raw) || 0 });
                      }
                    }}
                    onBlur={() => {
                      if (!model.message_rate || model.message_rate < 5) {
                        onChange({ ...model, message_rate: 5 });
                      }
                    }}
                    className="w-20 text-right"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">coins/msg</span>
                </div>
                {model.message_rate ? (
                  <span className="text-xs text-emerald-400/80">{coinsToUSD(model.message_rate)}/msg</span>
                ) : null}
              </div>
            </div>
          </div>


        </CardContent>
      </Card>

      {/* Booking Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Rates</CardTitle>
          <CardDescription>
            Set your rates for in-person services. 1 coin = $0.10 USD.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show Booking Rates Toggle */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg border bg-muted/50">
            <div className="min-w-0">
              <Label className="text-base font-semibold">Show Booking Rates</Label>
              <p className="text-sm text-muted-foreground">Display your booking rates on your public profile</p>
            </div>
            <Switch
              checked={model.show_booking_rates ?? true}
              onCheckedChange={(v) => onChange({ ...model, show_booking_rates: v })}
            />
          </div>

          {/* Show on Rates Directory Toggle */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg border bg-gradient-to-r from-pink-500/10 to-violet-500/10">
            <div className="min-w-0">
              <Label className="text-base font-semibold">List on Rates Directory</Label>
              <p className="text-sm text-muted-foreground">
                Appear on the public <Link href="/rates" className="text-pink-500 hover:underline">/rates</Link> page where brands can discover and book you
              </p>
            </div>
            <Switch
              checked={model.show_on_rates_page ?? false}
              onCheckedChange={(v) => onChange({ ...model, show_on_rates_page: v })}
            />
          </div>

          {/* Photography Rates */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4 text-pink-500" />
              Photography & Content
            </h4>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-pink-500/5">
                <div>
                  <Label>Hourly Rate</Label>
                  <p className="text-xs text-muted-foreground">Per hour for photoshoots</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100000"
                      value={model.photoshoot_hourly_rate || ""}
                      onChange={(e) => onChange({ ...model, photoshoot_hourly_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="1500"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.photoshoot_hourly_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.photoshoot_hourly_rate)}/hr</span> : null}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-pink-500/5">
                <div>
                  <Label>Half-Day Rate</Label>
                  <p className="text-xs text-muted-foreground">4 hours of shooting</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="500000"
                      value={model.photoshoot_half_day_rate || ""}
                      onChange={(e) => onChange({ ...model, photoshoot_half_day_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="5000"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.photoshoot_half_day_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.photoshoot_half_day_rate)}</span> : null}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-pink-500/5">
                <div>
                  <Label>Full-Day Rate</Label>
                  <p className="text-xs text-muted-foreground">8 hours of shooting</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="1000000"
                      value={model.photoshoot_full_day_rate || ""}
                      onChange={(e) => onChange({ ...model, photoshoot_full_day_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="8000"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.photoshoot_full_day_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.photoshoot_full_day_rate)}</span> : null}
                </div>
              </div>
            </div>
          </div>

          {/* Promotional Rates */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Promotional & Events
            </h4>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-500/5">
                <div>
                  <Label>Promo Modeling</Label>
                  <p className="text-xs text-muted-foreground">Per hour for promotional work</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100000"
                      value={model.promo_hourly_rate || ""}
                      onChange={(e) => onChange({ ...model, promo_hourly_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="750"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.promo_hourly_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.promo_hourly_rate)}/hr</span> : null}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-500/5">
                <div>
                  <Label>Brand Ambassador</Label>
                  <p className="text-xs text-muted-foreground">Daily rate for brand work</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="500000"
                      value={model.brand_ambassador_daily_rate || ""}
                      onChange={(e) => onChange({ ...model, brand_ambassador_daily_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="3000"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.brand_ambassador_daily_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.brand_ambassador_daily_rate)}/day</span> : null}
                </div>
              </div>
            </div>
          </div>

          {/* Private & Social Rates */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-violet-500" />
              Private & Social
            </h4>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-violet-500/5">
                <div>
                  <Label>Private Events</Label>
                  <p className="text-xs text-muted-foreground">Per hour for private events</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100000"
                      value={model.private_event_hourly_rate || ""}
                      onChange={(e) => onChange({ ...model, private_event_hourly_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="2000"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.private_event_hourly_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.private_event_hourly_rate)}/hr</span> : null}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-violet-500/5">
                <div>
                  <Label>Social Companion</Label>
                  <p className="text-xs text-muted-foreground">Per hour for social events</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100000"
                      value={model.social_companion_hourly_rate || ""}
                      onChange={(e) => onChange({ ...model, social_companion_hourly_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="1500"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.social_companion_hourly_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.social_companion_hourly_rate)}/hr</span> : null}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-violet-500/5">
                <div>
                  <Label>Meet & Greet</Label>
                  <p className="text-xs text-muted-foreground">Flat fee for appearances</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="500000"
                      value={model.meet_greet_rate || ""}
                      onChange={(e) => onChange({ ...model, meet_greet_rate: parseInt(e.target.value) || 0 })}
                      className="w-24 text-right"
                      placeholder="1000"
                    />
                    <span className="text-sm text-muted-foreground">coins</span>
                  </div>
                  {model.meet_greet_rate ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.meet_greet_rate)}</span> : null}
                </div>
              </div>
            </div>
          </div>

          {/* Travel Fee */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-500" />
              Additional Fees
            </h4>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-green-500/5">
              <div>
                <Label>Travel Fee</Label>
                <p className="text-xs text-muted-foreground">For out-of-area bookings</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100000"
                    value={model.travel_fee || ""}
                    onChange={(e) => onChange({ ...model, travel_fee: parseInt(e.target.value) || 0 })}
                    className="w-24 text-right"
                    placeholder="500"
                  />
                  <span className="text-sm text-muted-foreground">coins</span>
                </div>
                {model.travel_fee ? <span className="text-xs text-emerald-400/80">{coinsToUSD(model.travel_fee)}</span> : null}
              </div>
            </div>
          </div>

          {/* Tip */}
          <p className="text-sm text-muted-foreground">
            Set a rate to 0 coins to hide that service if you don&apos;t offer it.
          </p>

        </CardContent>
      </Card>
    </>
  );
}
