"use client";

import React from "react";
import { NewsItem, SentimentMetrics } from "@/types/market";
import { Newspaper, ExternalLink } from "lucide-react";

interface NewsFeedProps {
  news: NewsItem[];
  sentiment: SentimentMetrics | null;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, sentiment }) => {
  const [filter, setFilter] = React.useState<"ALL" | "MACRO" | "REGULATORY" | "BULLISH" | "BEARISH">("ALL");

  const label = sentiment?.overall_sentiment_label || "NEUTRAL";
  const score = sentiment?.overall_sentiment_score || 0;

  const filteredNews = news.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "MACRO") return item.catalyst_type === "MACRO";
    if (filter === "REGULATORY") return item.catalyst_type === "REGULATORY";
    if (filter === "BULLISH") return item.sentiment_label === "BULLISH";
    if (filter === "BEARISH") return item.sentiment_label === "BEARISH";
    return true;
  });

  return (
    <div className="bg-[#111622] border border-slate-800 rounded-md p-3.5 flex flex-col flex-1">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-xs text-white">Live News & Macro Intelligence</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
            label === "BULLISH"
              ? "bg-emerald-500/20 text-emerald-400"
              : label === "BEARISH"
              ? "bg-rose-500/20 text-rose-400"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {label} ({score >= 0 ? "+" : ""}
          {score.toFixed(2)})
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-2.5 overflow-x-auto pb-1 text-[10px] font-mono">
        {(["ALL", "MACRO", "REGULATORY", "BULLISH", "BEARISH"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === f
                ? "bg-blue-600 text-white font-semibold shadow"
                : "bg-[#171f30] text-slate-400 hover:text-slate-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* News Items Scroll */}
      <div className="space-y-2 overflow-y-auto max-h-[260px] pr-1">
        {filteredNews.length === 0 ? (
          <div className="text-slate-500 text-xs font-mono py-4 text-center">
            No news items matching selected filter.
          </div>
        ) : (
          filteredNews.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#171f30] hover:bg-slate-800/80 border border-slate-800 rounded p-2.5 transition-colors group"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>
                  {item.source} • {item.published_at.slice(0, 16)}
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold ${
                      item.sentiment_label === "BULLISH"
                        ? "text-emerald-400"
                        : item.sentiment_label === "BEARISH"
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {item.sentiment_label}
                  </span>
                  <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px]">
                    {item.catalyst_type}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
              <h4 className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                {item.title}
              </h4>
            </a>
          ))
        )}
      </div>
    </div>
  );
};
