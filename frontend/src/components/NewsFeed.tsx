"use client";

import React from "react";
import { NewsItem, SentimentMetrics } from "@/types/market";
import { Newspaper, ExternalLink } from "lucide-react";

interface NewsFeedProps {
  news: NewsItem[];
  sentiment: SentimentMetrics | null;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, sentiment }) => {
  const label = sentiment?.overall_sentiment_label || "NEUTRAL";
  const score = sentiment?.overall_sentiment_score || 0;

  return (
    <div className="bg-[#111622] border border-slate-800 rounded-md p-3.5 flex flex-col flex-1">
      {/* Header */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-xs text-white">Live Market News & Catalysts</span>
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

      {/* News Items Scroll */}
      <div className="space-y-2 overflow-y-auto max-h-[260px] pr-1">
        {news.length === 0 ? (
          <div className="text-slate-500 text-xs font-mono py-4 text-center">
            Fetching market news headlines...
          </div>
        ) : (
          news.map((item) => (
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
