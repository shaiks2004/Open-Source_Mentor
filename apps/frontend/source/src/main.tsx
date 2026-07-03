import React, { useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  AuthGuard,
  useCurrentUser,
  useRecords,
  useCreateRecord,
  useUpdateRecord,
  useWorkflowStart,
  useWorkflowRun
} from 'lemma-sdk/react'
import {
  LayoutDashboard,
  FolderGit2,
  ListTodo,
  BookOpen,
  GitPullRequest,
  Trophy,
  Settings,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Code2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  HelpCircle,
  Clock,
  ThumbsUp,
  User,
  Info
} from 'lucide-react'
import { lemmaClient } from './lemma-client'
import './styles.css'

const queryClient = new QueryClient()

type Tab = 'dashboard' | 'repos' | 'issues' | 'learning' | 'prs' | 'progress' | 'settings'

interface Repository {
  [key: string]: unknown
  id: string
  name: string
  url: string
  description?: string
  language?: string
  stars?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
}

interface Issue {
  [key: string]: unknown
  id: string
  repository_id: string
  gh_issue_id: number
  title: string
  description?: string
  labels?: string[]
  difficulty_score?: number
  is_beginner_friendly?: boolean
  suggested_skills?: string[]
  estimated_hours?: number
  status: 'open' | 'assigned' | 'completed'
  gh_url?: string
}

interface Task {
  [key: string]: unknown
  id: string
  issue_id: string
  developer_id: string
  status: 'claimed' | 'in-progress' | 'review' | 'completed' | 'blocked'
  notes?: string
}

interface LearningModule {
  [key: string]: unknown
  id: string
  repository_id: string
  title: string
  description?: string
  steps: {
    title: string
    description: string
    file_path?: string
    quiz?: {
      question: string
      options: string[]
      correct_index: number
    }
  }[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_duration_hours?: number
  status: 'active' | 'paused' | 'completed'
}

interface ProgressRecord {
  [key: string]: unknown
  id: string
  developer_id: string
  learning_module_id: string
  current_step: number
  completed_steps?: number[]
}

interface PullRequest {
  [key: string]: unknown
  id: string
  issue_id: string
  gh_pr_id: number
  developer_id: string
  title: string
  description?: string
  diff_summary?: string
  status: 'draft' | 'ready' | 'review' | 'approved' | 'merged'
  gh_url?: string
}

interface ReviewRecord {
  [key: string]: unknown
  id: string
  pull_request_id: string
  reviewer_type: 'ai_assistant' | 'human_maintainer'
  feedback: string
  suggestions?: {
    file_path: string
    line_number: number
    issue: string
    suggested_fix: string
  }[]
  approval_status: 'comment' | 'request_changes' | 'approve'
}

interface UserProfile {
  [key: string]: unknown
  id: string
  name: string
  email: string
  github_username?: string
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  preferred_languages?: string[]
  repositories_contributed_to?: number
  total_prs_submitted?: number
  total_hours_learning?: number
}

interface KnowledgeRecord {
  [key: string]: unknown
  id: string
  repository_id: string
  content_type: 'readme' | 'architecture' | 'guide' | 'summary' | 'diagram'
  title: string
  content: string
  source_file?: string
  generated_by_agent?: string
}

interface Stage {
  id: string
  label: string
  nodeId?: string
}

const STAGES: Stage[] = [
  { id: 'validating', label: 'Validating URL', nodeId: 'validate_url' },
  { id: 'fetching_meta', label: 'Fetching Metadata', nodeId: 'fetch_repo' },
  { id: 'saving_repo', label: 'Saving Repository', nodeId: 'create_repo_record' },
  { id: 'saving_readme', label: 'Saving README', nodeId: 'save_readme' },
  { id: 'analyzer', label: 'Running Repository Analyzer', nodeId: 'analyze_codebase' },
  { id: 'architecture', label: 'Explaining Architecture', nodeId: 'explain_arch' },
  { id: 'fetching_issues', label: 'Fetching Issues', nodeId: 'fetch_issues' },
  { id: 'ranking_issues', label: 'Ranking Issues', nodeId: 'recommend_issues' },
  { id: 'learning_path', label: 'Generating Learning Path', nodeId: 'generate_learning_path' },
  { id: 'preparing', label: 'Preparing Dashboard' }
]

const getStageStatus = (stage: Stage, run: any) => {
  if (!run) return 'pending'
  
  if (run.status === 'FAILED') {
    if (stage.nodeId && run.failed_node_id === stage.nodeId) return 'failed'
  }

  if (stage.id === 'preparing') {
    if (run.status === 'COMPLETED') return 'completed'
    const prevStagesCompleted = STAGES.slice(0, -1).every(s => getStageStatus(s, run) === 'completed')
    if (prevStagesCompleted) return 'running'
    return 'pending'
  }

  const step = run.step_history?.find((s: any) => s.node_id === stage.nodeId)
  if (!step) {
    if (run.current_node_id === stage.nodeId) return 'running'
    return 'pending'
  }

  if (step.status === 'COMPLETED') return 'completed'
  if (step.status === 'RUNNING') return 'running'
  if (step.status === 'FAILED') return 'failed'
  return 'pending'
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null)
  const [repoSubTab, setRepoSubTab] = useState<'info' | 'issues' | 'learning' | 'arch'>('info')
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null)
  
  // Quiz progress states
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  // Onboarding metadata URL
  const [importUrl, setImportUrl] = useState('')

  // 1. Fetch Current User Profile
  const { user: authUser } = useCurrentUser({ client: lemmaClient })
  
  const { records: userRecords, refresh: refreshUsers } = useRecords<UserProfile>({
    client: lemmaClient,
    tableName: 'users',
  })
  
  const currentUserProfile = useMemo(() => {
    return userRecords.find(p => p.email === authUser?.email) || null
  }, [userRecords, authUser])

  // 2. Fetch Datastore tables
  const { records: repos, isLoading: loadingRepos, refresh: refreshRepos } = useRecords<Repository>({
    client: lemmaClient,
    tableName: 'repositories',
  })

  const { records: issues, isLoading: loadingIssues, refresh: refreshIssues } = useRecords<Issue>({
    client: lemmaClient,
    tableName: 'issues',
  })

  const { records: tasks, refresh: refreshTasks } = useRecords<Task>({
    client: lemmaClient,
    tableName: 'tasks',
  })

  const { records: modules, refresh: refreshModules } = useRecords<LearningModule>({
    client: lemmaClient,
    tableName: 'learning_modules',
  })

  const { records: progresses, refresh: refreshProgress } = useRecords<ProgressRecord>({
    client: lemmaClient,
    tableName: 'progress',
  })

  const { records: prs, refresh: refreshPrs } = useRecords<PullRequest>({
    client: lemmaClient,
    tableName: 'pull_requests',
  })

  const { records: reviews, refresh: refreshReviews } = useRecords<ReviewRecord>({
    client: lemmaClient,
    tableName: 'reviews',
  })

  const { records: knowledge, refresh: refreshKnowledge } = useRecords<KnowledgeRecord>({
    client: lemmaClient,
    tableName: 'knowledge',
  })

  // Mutations
  const { create: createUserProfile } = useCreateRecord({ client: lemmaClient, tableName: 'users' })
  const { update: updateUserProfile } = useUpdateRecord({ client: lemmaClient, tableName: 'users' })
  const { create: createTask } = useCreateRecord({ client: lemmaClient, tableName: 'tasks' })
  const { update: updateIssue } = useUpdateRecord({ client: lemmaClient, tableName: 'issues' })
  const { create: createProgress } = useCreateRecord({ client: lemmaClient, tableName: 'progress' })
  const { update: updateProgress } = useUpdateRecord({ client: lemmaClient, tableName: 'progress' })

  // Workflows
  const importWorkflow = useWorkflowRun({
    client: lemmaClient,
    workflowName: 'import-repository'
  })

  const recommendWorkflow = useWorkflowStart({
    client: lemmaClient,
    workflowName: 'recommend-issues'
  })

  const reviewWorkflow = useWorkflowStart({
    client: lemmaClient,
    workflowName: 'review-pull-request'
  })

  const reportWorkflow = useWorkflowStart({
    client: lemmaClient,
    workflowName: 'generate-weekly-report'
  })

  // Auto refresh when repository import completes
  React.useEffect(() => {
    if (importWorkflow.run?.status === 'COMPLETED') {
      refreshRepos()
      refreshIssues()
      refreshKnowledge()
      refreshModules()
      
      const timer = setTimeout(() => {
        importWorkflow.setRunId(null)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [importWorkflow.run?.status])

  // UI action handlers
  const handleImportRepo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importUrl.trim()) return
    try {
      await importWorkflow.start({ url: importUrl.trim() })
      setImportUrl('')
    } catch (err) {
      alert('Failed to start import workflow: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleClaimIssue = async (issue: Issue) => {
    if (!currentUserProfile) {
      alert('Please complete your User profile in Settings first!')
      setActiveTab('settings')
      return
    }
    try {
      // Create claimed task
      await createTask({
        issue_id: issue.id,
        developer_id: currentUserProfile.id,
        status: 'claimed',
        notes: `Claimed issue #${issue.gh_issue_id}: ${issue.title}`
      })
      // Update issue status to assigned
      await updateIssue({ status: 'assigned', assigned_to_user_id: currentUserProfile.id }, { recordId: issue.id })
      alert('Issue successfully claimed! Created task tracker.')
      refreshIssues()
      refreshTasks()
    } catch (err) {
      alert('Failed to claim issue: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleTriggerReview = async (prId: string) => {
    try {
      await reviewWorkflow.start({ pull_request_id: prId })
      alert('PR Review Assistant triggered! Reviews will populate in a few moments.')
      setTimeout(() => refreshReviews(), 3000)
    } catch (err) {
      alert('Failed to start review workflow: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleTriggerWeeklyReport = async () => {
    if (!currentUserProfile) return
    try {
      await reportWorkflow.start({ developer_id: currentUserProfile.id })
      alert('Weekly progress analysis triggered!')
    } catch (err) {
      alert('Failed to start report: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Helper selectors
  const selectedRepo = useMemo(() => {
    return repos.find(r => r.id === selectedRepoId) || null
  }, [repos, selectedRepoId])

  const selectedRepoReadme = useMemo(() => {
    if (!selectedRepoId) return null
    return knowledge.find(k => k.repository_id === selectedRepoId && k.content_type === 'readme') || null
  }, [knowledge, selectedRepoId])

  const selectedRepoArch = useMemo(() => {
    if (!selectedRepoId) return null
    return knowledge.find(k => k.repository_id === selectedRepoId && k.content_type === 'architecture') || null
  }, [knowledge, selectedRepoId])

  const selectedRepoDiag = useMemo(() => {
    if (!selectedRepoId) return null
    return knowledge.find(k => k.repository_id === selectedRepoId && k.content_type === 'diagram') || null
  }, [knowledge, selectedRepoId])

  return (
    <div className="app-shell">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-icon">
            <Code2 size={20} />
          </div>
          <span className="brand-name">OpenSource Mentor</span>
        </div>

        <nav className="nav-group">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={18} />
            Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'repos' ? 'active' : ''}`} onClick={() => setActiveTab('repos')}>
            <FolderGit2 size={18} />
            Repositories
          </div>
          <div className={`nav-item ${activeTab === 'issues' ? 'active' : ''}`} onClick={() => setActiveTab('issues')}>
            <ListTodo size={18} />
            Issue Workspace
          </div>
          <div className={`nav-item ${activeTab === 'learning' ? 'active' : ''}`} onClick={() => setActiveTab('learning')}>
            <BookOpen size={18} />
            Learning Center
          </div>
          <div className={`nav-item ${activeTab === 'prs' ? 'active' : ''}`} onClick={() => setActiveTab('prs')}>
            <GitPullRequest size={18} />
            PR Review
          </div>
          <div className={`nav-item ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>
            <Trophy size={18} />
            Progress Hub
          </div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={18} />
            Profile Settings
          </div>
        </nav>

        <div className="user-profile-section">
          <div className="user-avatar">
            {authUser?.first_name ? authUser.first_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">
              {authUser?.first_name ? `${authUser.first_name} ${authUser.last_name || ''}` : authUser?.email || 'User'}
            </span>
            <span className="user-role">{currentUserProfile?.experience_level || 'Beginner'} Developer</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-content">
        <header className="header-bar">
          <h1 className="page-title">
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'repos' && 'Repository Explorer'}
            {activeTab === 'issues' && 'Issue Workspace'}
            {activeTab === 'learning' && 'Learning Center'}
            {activeTab === 'prs' && 'Pull Request Review'}
            {activeTab === 'progress' && 'Progress Dashboard'}
            {activeTab === 'settings' && 'User Settings'}
          </h1>
          <button className="btn btn-secondary" onClick={() => {
            refreshRepos()
            refreshIssues()
            refreshTasks()
            refreshModules()
            refreshProgress()
            refreshPrs()
            refreshReviews()
            refreshKnowledge()
            refreshUsers()
          }}>
            <RefreshCw size={14} />
            Sync Datastore
          </button>
        </header>

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="view-container">
            <div className="stats-grid">
              <div className="card">
                <div className="stat-label">Tracked Repositories</div>
                <div className="stat-value">{repos.length}</div>
                <div className="stat-desc">Imported open source projects</div>
              </div>
              <div className="card">
                <div className="stat-label">Claimed Issues</div>
                <div className="stat-value">{tasks.filter(t => t.status === 'claimed' || t.status === 'in-progress').length}</div>
                <div className="stat-desc">Issues active in workspace</div>
              </div>
              <div className="card">
                <div className="stat-label">Onboarding Learning Modules</div>
                <div className="stat-value">{modules.length}</div>
                <div className="stat-desc">Available educational paths</div>
              </div>
              <div className="card">
                <div className="stat-label">Reviewed PRs</div>
                <div className="stat-value">{prs.length}</div>
                <div className="stat-desc">AI assisted pull reviews</div>
              </div>
            </div>

            <div className="detail-layout">
              <div className="detail-main">
                <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.04) 0%, rgba(236, 72, 153, 0.02) 100%)', borderColor: 'rgba(249, 115, 22, 0.25)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Play size={18} style={{ color: 'var(--accent-orange)' }} />
                    Quick Start Onboarding Guide
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    Welcome to OpenSource Mentor! Follow these 5 steps to kickstart your open-source journey:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-orange)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>1</div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Set Up Your Profile</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                          Go to the <span style={{ color: 'var(--accent-purple)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setActiveTab('settings')}>Profile Settings</span> tab to create your profile and choose your experience level.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-orange)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>2</div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Import a Repository</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                          Go to <span style={{ color: 'var(--accent-purple)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setActiveTab('repos')}>Repositories</span> and enter a GitHub URL to trigger the codebase analysis.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-orange)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>3</div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Claim an analyzed Issue</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                          Open the <span style={{ color: 'var(--accent-purple)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setActiveTab('issues')}>Issue Workspace</span> to browse recommended issues scored by complexity and claim a task.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-orange)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>4</div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Study Your Syllabus</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                          Navigate to the <span style={{ color: 'var(--accent-purple)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setActiveTab('learning')}>Learning Center</span> to follow the customized syllabus generated for your repository.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-orange)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>5</div>
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>Submit & Review Pull Request</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                          Once your code is ready, open a PR and click trigger in <span style={{ color: 'var(--accent-purple)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setActiveTab('prs')}>PR Review</span> to receive automated AI review feedback.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '16px' }}>Active Learning modules</h3>
                  {modules.length === 0 ? (
                    <div className="empty-state">
                      <BookOpen size={36} className="empty-state-icon" />
                      <div className="empty-state-title">No onboarding modules generated</div>
                      <p>Import a repository to trigger onboarding syllabus creation.</p>
                    </div>
                  ) : (
                    <div className="item-list">
                      {modules.slice(0, 3).map(mod => (
                        <div key={mod.id} className="list-item" onClick={() => {
                          setSelectedModuleId(mod.id)
                          setActiveTab('learning')
                        }} style={{ cursor: 'pointer' }}>
                          <div>
                            <p style={{ fontWeight: 600 }}>{mod.title}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{mod.steps.length} Steps • {mod.estimated_duration_hours || 2} Hours</p>
                          </div>
                          <span className={`badge badge-purple`}>{mod.difficulty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-sidebar">
                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '12px' }}>Developer Stats</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Experience Level</span>
                      <span>{currentUserProfile?.experience_level || 'Beginner'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">PRs Reviewed</span>
                      <span>{currentUserProfile?.total_prs_submitted || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Hours Onboarded</span>
                      <span>{currentUserProfile?.total_hours_learning || 0} hrs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. REPOSITORY EXPLORER */}
        {activeTab === 'repos' && (
          <div className="view-container">
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>Import GitHub Repository</h3>
              <form onSubmit={handleImportRepo} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder={importWorkflow.run && !importWorkflow.isFinished ? "Import in progress..." : "https://github.com/owner/repo"}
                  className="form-input"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  style={{ flexGrow: 1 }}
                  disabled={!!importWorkflow.run && !importWorkflow.isFinished}
                />
                <button type="submit" className="btn btn-primary" disabled={!!importWorkflow.run && !importWorkflow.isFinished}>
                  <Plus size={16} />
                  Import
                </button>
              </form>
            </div>

            {selectedRepoId && selectedRepo ? (
              <div>
                <button className="btn btn-secondary" onClick={() => setSelectedRepoId(null)} style={{ marginBottom: '16px' }}>
                  Back to Explorer
                </button>

                <div className="card" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700 }}>{selectedRepo.name}</h2>
                    <a href={selectedRepo.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '12px' }}>
                      GitHub Link
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{selectedRepo.description || 'No description provided.'}</p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <span>Language: <strong>{selectedRepo.language || 'Unknown'}</strong></span>
                    <span>Stars: <strong>{selectedRepo.stars || 0}</strong></span>
                    <span>Difficulty: <strong>{selectedRepo.difficulty_level || 'Beginner'}</strong></span>
                  </div>
                </div>

                <div className="tab-row">
                  <button className={`tab-btn ${repoSubTab === 'info' ? 'active' : ''}`} onClick={() => setRepoSubTab('info')}>README</button>
                  <button className={`tab-btn ${repoSubTab === 'issues' ? 'active' : ''}`} onClick={() => setRepoSubTab('issues')}>Issues ({issues.filter(i => i.repository_id === selectedRepoId).length})</button>
                  <button className={`tab-btn ${repoSubTab === 'learning' ? 'active' : ''}`} onClick={() => setRepoSubTab('learning')}>Learning Syllabus</button>
                  <button className={`tab-btn ${repoSubTab === 'arch' ? 'active' : ''}`} onClick={() => setRepoSubTab('arch')}>Architecture Docs</button>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {repoSubTab === 'info' && (
                    <div className="card markdown-body">
                      {selectedRepoReadme ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{selectedRepoReadme.content}</div>
                      ) : (
                        <p>No README content saved for this repository.</p>
                      )}
                    </div>
                  )}

                  {repoSubTab === 'issues' && (
                    <div className="item-list">
                      {issues.filter(i => i.repository_id === selectedRepoId).length === 0 ? (
                        <div className="empty-state">
                          <ListTodo size={36} />
                          <div className="empty-state-title">No issues analyzed yet</div>
                        </div>
                      ) : (
                        issues.filter(i => i.repository_id === selectedRepoId).map(issue => (
                          <div key={issue.id} className="list-item">
                            <div>
                              <p style={{ fontWeight: 600 }}>#{issue.gh_issue_id}: {issue.title}</p>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                                <span>Diff Score: {issue.difficulty_score || 'N/A'}/10</span>
                                <span>Est. Hours: {issue.estimated_hours || 'N/A'}</span>
                                {issue.is_beginner_friendly && <span style={{ color: 'var(--accent-green)' }}>Beginner Friendly</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              {issue.status === 'open' ? (
                                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleClaimIssue(issue)}>Claim</button>
                              ) : (
                                <span className="badge badge-purple">{issue.status}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {repoSubTab === 'learning' && (
                    <div className="item-list">
                      {modules.filter(m => m.repository_id === selectedRepoId).length === 0 ? (
                        <div className="empty-state">
                          <BookOpen size={36} />
                          <div className="empty-state-title">No syllabus generated yet</div>
                        </div>
                      ) : (
                        modules.filter(m => m.repository_id === selectedRepoId).map(mod => (
                          <div key={mod.id} className="list-item" onClick={() => {
                            setSelectedModuleId(mod.id)
                            setActiveTab('learning')
                          }} style={{ cursor: 'pointer' }}>
                            <div>
                              <p style={{ fontWeight: 600 }}>{mod.title}</p>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{mod.steps.length} Steps</p>
                            </div>
                            <span className="badge badge-purple">{mod.difficulty}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {repoSubTab === 'arch' && (
                    <div className="card">
                      {selectedRepoArch ? (
                        <div className="markdown-body">
                          <h2 style={{ fontFamily: 'var(--font-display)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Architecture & Codebase Flow</h2>
                          <div style={{ whiteSpace: 'pre-wrap', marginTop: '16px' }}>{selectedRepoArch.content}</div>
                          {selectedRepoDiag && (
                            <div style={{ marginTop: '24px' }}>
                              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Module Diagram</h3>
                              <pre style={{ backgroundColor: '#0c0c0e', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
                                <code>{selectedRepoDiag.content}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p>No architecture notes compiled yet. Running background analysis...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="item-list">
                {repos.length === 0 ? (
                  <div className="empty-state">
                    <FolderGit2 size={36} />
                    <div className="empty-state-title">No repositories imported</div>
                  </div>
                ) : (
                  repos.map(repo => (
                    <div key={repo.id} className="list-item" onClick={() => {
                      setSelectedRepoId(repo.id)
                      setRepoSubTab('info')
                    }} style={{ cursor: 'pointer' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '16px' }}>{repo.name}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{repo.url}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className="badge badge-purple">{repo.language || 'Stack'}</span>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. ISSUE WORKSPACE */}
        {activeTab === 'issues' && (
          <div className="view-container">
            <div className="item-list">
              {issues.length === 0 ? (
                <div className="empty-state">
                  <ListTodo size={36} />
                  <div className="empty-state-title">No recommended issues found</div>
                </div>
              ) : (
                issues.map(issue => (
                  <div key={issue.id} className="list-item">
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '15px' }}>#{issue.gh_issue_id}: {issue.title}</p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-purple)' }}>Diff score: {issue.difficulty_score || 'N/A'}</span>
                        <span>Estimated duration: {issue.estimated_hours || 'N/A'} hours</span>
                        {issue.is_beginner_friendly && <span className="badge badge-green">Beginner Friendly</span>}
                      </div>
                    </div>
                    <div>
                      {issue.status === 'open' ? (
                        <button className="btn btn-primary" onClick={() => handleClaimIssue(issue)}>Claim Ticket</button>
                      ) : (
                        <span className="badge badge-purple">{issue.status}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. LEARNING CENTER */}
        {activeTab === 'learning' && (
          <div className="view-container">
            {selectedModuleId ? (
              <div>
                <button className="btn btn-secondary" onClick={() => {
                  setSelectedModuleId(null)
                  setQuizSubmitted(false)
                  setQuizAnswers({})
                }} style={{ marginBottom: '16px' }}>
                  Back to Modules
                </button>

                {(() => {
                  const mod = modules.find(m => m.id === selectedModuleId)
                  if (!mod) return <p>Module not found.</p>
                  return (
                    <div className="card">
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{mod.title}</h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{mod.description}</p>

                      <div className="item-list">
                        {mod.steps.map((step, idx) => (
                          <div key={idx} className="module-step">
                            <div className="step-number">{idx + 1}</div>
                            <div className="step-content">
                              <h4 className="step-title">{step.title}</h4>
                              <p className="step-desc">{step.description}</p>
                              {step.file_path && (
                                <p style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                                  Reference file: {step.file_path}
                                </p>
                              )}

                              {step.quiz && (
                                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                  <p style={{ fontWeight: 600, marginBottom: '12px' }}><HelpCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Checkpoint quiz: {step.quiz.question}</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {step.quiz.options.map((opt, oIdx) => (
                                      <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                          type="radio"
                                          name={`quiz-${idx}`}
                                          checked={quizAnswers[idx] === oIdx}
                                          onChange={() => setQuizAnswers(prev => ({ ...prev, [idx]: oIdx }))}
                                          disabled={quizSubmitted}
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                        {!quizSubmitted ? (
                          <button className="btn btn-primary" onClick={() => {
                            setQuizSubmitted(true)
                          }}>
                            Submit checkpoints
                          </button>
                        ) : (
                          <div>
                            <p style={{ color: 'var(--accent-green)', fontWeight: 600, marginBottom: '8px' }}>Checkpoints submitted successfully!</p>
                            <button className="btn btn-secondary" onClick={() => {
                              setQuizSubmitted(false)
                              setQuizAnswers({})
                            }}>Retake checkpoints</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="item-list">
                {modules.length === 0 ? (
                  <div className="empty-state">
                    <BookOpen size={36} />
                    <div className="empty-state-title">No syllabus generated yet</div>
                  </div>
                ) : (
                  modules.map(mod => (
                    <div key={mod.id} className="list-item" onClick={() => setSelectedModuleId(mod.id)} style={{ cursor: 'pointer' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '16px' }}>{mod.title}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>{mod.description || 'Onboarding module.'}</p>
                      </div>
                      <span className="badge badge-purple">{mod.difficulty}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. PR REVIEW */}
        {activeTab === 'prs' && (
          <div className="view-container">
            {selectedPrId ? (
              <div>
                <button className="btn btn-secondary" onClick={() => setSelectedPrId(null)} style={{ marginBottom: '16px' }}>
                  Back to PR list
                </button>

                {(() => {
                  const pr = prs.find(p => p.id === selectedPrId)
                  if (!pr) return <p>PR not found.</p>
                  const prReviewList = reviews.filter(r => r.pull_request_id === pr.id)

                  return (
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>{pr.title}</h2>
                        <button className="btn btn-primary" onClick={() => handleTriggerReview(pr.id)}>Re-Run AI review</button>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <h4 className="stat-label">Description</h4>
                        <p style={{ color: 'var(--text-secondary)' }}>{pr.description || 'No description provided.'}</p>
                      </div>

                      {pr.diff_summary && (
                        <div style={{ marginBottom: '24px' }}>
                          <h4 className="stat-label">PR Diff Summary</h4>
                          <pre style={{ backgroundColor: '#0c0c0e', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
                            <code>{pr.diff_summary}</code>
                          </pre>
                        </div>
                      )}

                      <div>
                        <h4 className="stat-label">AI review reports</h4>
                        {prReviewList.length === 0 ? (
                          <div className="empty-state">
                            <Info size={36} />
                            <div className="empty-state-title">No reviews recorded yet</div>
                            <p>Click "Re-Run AI review" to analyze diff logs.</p>
                          </div>
                        ) : (
                          prReviewList.map(rev => (
                            <div key={rev.id} className="card" style={{ marginTop: '16px', borderLeft: '4px solid var(--accent-purple)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontWeight: 600 }}>AI assistant feedback</span>
                                <span className={`badge ${rev.approval_status === 'approve' ? 'badge-green' : 'badge-orange'}`}>{rev.approval_status}</span>
                              </div>
                              <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>{rev.feedback}</p>

                              {rev.suggestions && rev.suggestions.length > 0 && (
                                <div>
                                  <h5 style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Line level refactoring suggestions</h5>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {rev.suggestions.map((sug, sIdx) => (
                                      <div key={sIdx} className="suggestion-card">
                                        <p style={{ fontSize: '12px', fontWeight: 600 }}>File: {sug.file_path} • Line {sug.line_number}</p>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0' }}>{sug.issue}</p>
                                        <div className="code-diff">{sug.suggested_fix}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="item-list">
                {prs.length === 0 ? (
                  <div className="empty-state">
                    <GitPullRequest size={36} />
                    <div className="empty-state-title">No pull requests tracked</div>
                  </div>
                ) : (
                  prs.map(pr => (
                    <div key={pr.id} className="list-item" onClick={() => setSelectedPrId(pr.id)} style={{ cursor: 'pointer' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '15px' }}>{pr.title}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>PR #{pr.gh_pr_id}</p>
                      </div>
                      <span className="badge badge-purple">{pr.status}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. PROGRESS HUB */}
        {activeTab === 'progress' && (
          <div className="view-container">
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Weekly Contribution Assessment</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Compiles all tasks completed and modules learned into a unified profile summary report.</p>
              </div>
              <button className="btn btn-primary" onClick={handleTriggerWeeklyReport}>
                <Trophy size={16} />
                Generate report
              </button>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>Task Completion Logs</h3>
              <div className="item-list">
                {tasks.length === 0 ? (
                  <div className="empty-state">
                    <ListTodo size={36} />
                    <div className="empty-state-title">No tasks completed yet</div>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="list-item">
                      <div>
                        <p style={{ fontWeight: 600 }}>{task.notes || 'Contribution Task'}</p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {task.id}</span>
                      </div>
                      <span className={`badge ${task.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>{task.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. SETTINGS */}
        {activeTab === 'settings' && (
          <div className="view-container">
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Developer Profile</h3>
              {currentUserProfile ? (
                <div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" defaultValue={currentUserProfile.name} id="editName" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GitHub Username</label>
                    <input type="text" className="form-input" defaultValue={currentUserProfile.github_username} id="editGhUser" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Experience Level</label>
                    <select className="form-input" defaultValue={currentUserProfile.experience_level} id="editLevel">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={async () => {
                    const editName = (document.getElementById('editName') as HTMLInputElement)?.value
                    const editGhUser = (document.getElementById('editGhUser') as HTMLInputElement)?.value
                    const editLevel = (document.getElementById('editLevel') as HTMLSelectElement)?.value as any
                    try {
                      await updateUserProfile({
                        name: editName,
                        github_username: editGhUser,
                        experience_level: editLevel
                      }, { recordId: currentUserProfile.id })
                      alert('Profile updated successfully!')
                      refreshUsers()
                    } catch (err) {
                      alert('Update failed: ' + err)
                    }
                  }}>Save profile</button>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '16px' }}>Set up your workspace onboarding preferences.</p>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" id="newName" placeholder="Jane Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GitHub Username</label>
                    <input type="text" className="form-input" id="newGhUser" placeholder="janedoe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Experience Level</label>
                    <select className="form-input" id="newLevel">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={async () => {
                    const newName = (document.getElementById('newName') as HTMLInputElement)?.value
                    const newGhUser = (document.getElementById('newGhUser') as HTMLInputElement)?.value
                    const newLevel = (document.getElementById('newLevel') as HTMLSelectElement)?.value as any
                    if (!newName) {
                      alert('Name is required!')
                      return
                    }
                    try {
                      await createUserProfile({
                        name: newName,
                        email: authUser?.email || '',
                        github_username: newGhUser,
                        experience_level: newLevel,
                        repositories_contributed_to: 0,
                        total_prs_submitted: 0,
                        total_hours_learning: 0
                      })
                      alert('Profile created!')
                      refreshUsers()
                    } catch (err) {
                      alert('Creation failed: ' + err)
                    }
                  }}>Create profile</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 8. PREMIUM IMPORT PROGRESS MODAL */}
      {importWorkflow.run && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(252, 251, 250, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div className="card" style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(249, 115, 22, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '4px',
              textAlign: 'center'
            }}>Importing Repository</h3>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '24px',
              textAlign: 'center',
              wordBreak: 'break-all'
            }}>{importWorkflow.run.execution_context?.url || 'Processing request...'}</p>

            {/* Circular Progress Indicator */}
            <div style={{ position: 'relative', width: '128px', height: '128px', marginBottom: '28px' }}>
              {/* Spinning glow ring */}
              {importWorkflow.run.status === 'RUNNING' && (
                <div style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: 'var(--accent-orange)',
                  animation: 'spin 2s linear infinite',
                  opacity: 0.5
                }} />
              )}
              <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke="rgba(249, 115, 22, 0.15)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke={importWorkflow.run.status === 'FAILED' ? 'var(--accent-red)' : 'var(--accent-orange)'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - (STAGES.filter(s => getStageStatus(s, importWorkflow.run) === 'completed').length / STAGES.length))}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
              </svg>
              {/* Percentage Text */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {Math.min(Math.round((STAGES.filter(s => getStageStatus(s, importWorkflow.run) === 'completed').length / STAGES.length) * 100), 100)}%
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {importWorkflow.run.status}
                </span>
              </div>
            </div>

            {/* Stages Checklist */}
            <div style={{
              width: '100%',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingRight: '4px',
              marginBottom: '20px'
            }}>
              {STAGES.map(stage => {
                const status = getStageStatus(stage, importWorkflow.run)
                return (
                  <div key={stage.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: status === 'completed' ? 'var(--text-primary)' : status === 'running' ? 'var(--accent-orange)' : status === 'failed' ? 'var(--accent-red)' : 'var(--text-secondary)',
                    fontWeight: status === 'running' ? 600 : 400
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {status === 'running' && (
                        <RefreshCw size={14} className="spinner" style={{ color: 'var(--accent-orange)' }} />
                      )}
                      {status === 'completed' && (
                        <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                      )}
                      {status === 'failed' && (
                        <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} />
                      )}
                      {status === 'pending' && (
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--text-secondary)', opacity: 0.4 }} />
                      )}
                      {stage.label}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 600,
                      opacity: status === 'pending' ? 0.4 : 0.8
                    }}>
                      {status}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Error Message if Failed */}
            {importWorkflow.run.status === 'FAILED' && (
              <div style={{
                width: '100%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#fca5a5',
                overflowWrap: 'anywhere'
              }}>
                <strong>Error:</strong> {importWorkflow.run.error || 'Workflow execution failed.'}
              </div>
            )}

            {/* Close Button if finished or failed */}
            {(importWorkflow.isFinished || importWorkflow.run.status === 'FAILED') && (
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => importWorkflow.setRunId(null)}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGuard
        client={lemmaClient}
        loadingFallback={
          <div style={{ display: 'flex', height: '100vh', backgroundColor: '#fcfbfa', alignItems: 'center', justifyContent: 'center', color: '#1c1917' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div className="spinner" style={{ borderLeftColor: 'var(--accent-orange)' }} />
              <span>Verifying workspace session...</span>
            </div>
          </div>
        }
      >
        <App />
      </AuthGuard>
    </QueryClientProvider>
  </React.StrictMode>,
)
