import React, { useMemo } from 'react';
import {
  Send,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Sparkles,
  Building2,
  Clock,
  CheckCircle2,
  Award,
} from 'lucide-react';
import type { JobApplication, ApplicationStatus } from '@/lib/types';

interface KanbanBoardProps {
  applications: JobApplication[];
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onOpenOutreach?: (company: string, role: string) => void;
  onOpenJdMatcher?: (role: string, desc: string) => void;
}

const COLUMNS: Array<{ key: ApplicationStatus; title: string; icon: any; color: string }> = [
  { key: 'Applied', title: 'Applied', icon: Clock, color: 'blue' },
  { key: 'Interviewing', title: 'Interviewing', icon: Sparkles, color: 'purple' },
  { key: 'Offer', title: 'Offer Received', icon: Award, color: 'green' },
  { key: 'Rejected', title: 'Archived / Other', icon: CheckCircle2, color: 'slate' },
];

export function KanbanBoard({
  applications,
  onStatusChange,
  onOpenOutreach,
  onOpenJdMatcher,
}: KanbanBoardProps) {
  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, JobApplication[]> = {
      Applied: [],
      Interviewing: [],
      Offer: [],
      Rejected: [],
    };
    for (const app of applications) {
      if (map[app.status]) {
        map[app.status].push(app);
      } else {
        map.Applied.push(app);
      }
    }
    return map;
  }, [applications]);

  const getDaysAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    return `${diff} days ago`;
  };

  return (
    <div className="kanban-board-wrap">
      <div className="kanban-grid">
        {COLUMNS.map((col) => {
          const items = grouped[col.key] || [];
          const Icon = col.icon;
          return (
            <div key={col.key} className={`kanban-col ${col.color}`}>
              <div className="kanban-col-head">
                <div className="kanban-col-title">
                  <Icon size={15} />
                  <span>{col.title}</span>
                </div>
                <span className="kanban-col-count">{items.length}</span>
              </div>

              <div className="kanban-col-body">
                {items.length === 0 ? (
                  <div className="kanban-empty-slot">
                    <p>No applications in this stage</p>
                  </div>
                ) : (
                  items.map((app) => {
                    const daysAgo = getDaysAgo(app.created_at);
                    const isFollowUpDue = col.key === 'Applied' && (daysAgo.includes('5') || daysAgo.includes('6') || daysAgo.includes('7') || daysAgo.includes('8'));

                    return (
                      <div key={app.id} className="kanban-card glass-card">
                        <div className="kanban-card-top">
                          <div className="kanban-company-info">
                            <span className="kanban-comp-name">
                              <Building2 size={12} style={{ marginRight: 4, opacity: 0.7 }} />
                              {app.company}
                            </span>
                            <strong className="kanban-role-title">{app.role}</strong>
                          </div>
                        </div>

                        <div className="kanban-meta-row">
                          <span className="kanban-date">
                            <Calendar size={11} style={{ marginRight: 3 }} /> {daysAgo}
                          </span>
                          {isFollowUpDue && (
                            <span className="kanban-pill follow-up" title="5+ days since applied without response">
                              Follow-up Due
                            </span>
                          )}
                        </div>

                        {/* Quick actions */}
                        <div className="kanban-card-actions">
                          {onOpenOutreach && (
                            <button
                              className="kanban-act-btn"
                              title="Generate Recruiter Follow-up / Outreach"
                              onClick={() => onOpenOutreach(app.company, app.role)}
                            >
                              <Send size={11} /> Outreach
                            </button>
                          )}
                          {onOpenJdMatcher && (
                            <button
                              className="kanban-act-btn"
                              title="Analyze Role ATS Fit"
                              onClick={() => onOpenJdMatcher(app.role, `${app.role} at ${app.company}`)}
                            >
                              <Sparkles size={11} /> Match JD
                            </button>
                          )}
                          {app.link && (
                            <a
                              href={app.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="kanban-act-btn icon-only"
                              title="Open External Job Search"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>

                        {/* Stage transition controls */}
                        <div className="kanban-stage-nav">
                          {col.key !== 'Applied' && (
                            <button
                              className="kanban-move-btn"
                              title="Move back a stage"
                              onClick={() => {
                                const prev =
                                  col.key === 'Rejected'
                                    ? 'Offer'
                                    : col.key === 'Offer'
                                    ? 'Interviewing'
                                    : 'Applied';
                                onStatusChange(app.id, prev as ApplicationStatus);
                              }}
                            >
                              <ChevronLeft size={13} />
                            </button>
                          )}
                          <div style={{ flex: 1 }} />
                          {col.key !== 'Rejected' && (
                            <button
                              className="kanban-move-btn next"
                              title="Move to next stage"
                              onClick={() => {
                                const next =
                                  col.key === 'Applied'
                                    ? 'Interviewing'
                                    : col.key === 'Interviewing'
                                    ? 'Offer'
                                    : 'Rejected';
                                onStatusChange(app.id, next as ApplicationStatus);
                              }}
                            >
                              <span>
                                {col.key === 'Applied'
                                  ? 'Interviewing'
                                  : col.key === 'Interviewing'
                                  ? 'Offer!'
                                  : 'Archive'}
                              </span>
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
