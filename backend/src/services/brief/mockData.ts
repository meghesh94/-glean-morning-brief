// Mock data for testing without OAuth setup

export const mockSlackThreads = [
  {
    channel: 'C123456',
    thread_ts: '1234567890.123456',
    messages: [
      {
        text: 'Hey, we need your decision on event sourcing vs CQRS for the payment service. The team is blocked.',
        ts: '1234567890.123456',
        user: 'U111111',
        channel: 'C123456'
      },
      {
        text: 'Marcus and two engineers have been waiting 3 days for this.',
        ts: '1234567891.123456',
        user: 'U222222',
        channel: 'C123456',
        thread_ts: '1234567890.123456'
      },
      {
        text: 'This is blocking the sprint milestone.',
        ts: '1234567892.123456',
        user: 'U333333',
        channel: 'C123456',
        thread_ts: '1234567890.123456'
      },
      {
        text: 'Can we get an update today?',
        ts: '1234567893.123456',
        user: 'U111111',
        channel: 'C123456',
        thread_ts: '1234567890.123456'
      }
    ]
  },
  {
    channel: 'C789012',
    thread_ts: '1234567800.123456',
    messages: [
      {
        text: 'Design doc review needed for the new feature',
        ts: '1234567800.123456',
        user: 'U444444',
        channel: 'C789012'
      },
      {
        text: 'Sarah shared this yesterday, unread',
        ts: '1234567801.123456',
        user: 'U555555',
        channel: 'C789012',
        thread_ts: '1234567800.123456'
      }
    ]
  }
];

export const mockGitHubPRs = [
  {
    id: 12345,
    number: 42,
    title: 'Add payment service architecture',
    body: 'Implements event sourcing pattern for payment processing',
    state: 'open',
    user: { login: 'dev-engineer' },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    html_url: 'https://github.com/company/repo/pull/42',
    head: { ref: 'feature/payment-service' },
    base: { ref: 'main' },
    additions: 150,
    deletions: 30,
    changed_files: 12,
    review_comments: 5,
    requested_reviewers: [{ login: 'you' }]
  },
  {
    id: 12346,
    number: 43,
    title: 'Fix authentication bug',
    body: 'Resolves issue with token refresh',
    state: 'open',
    user: { login: 'another-dev' },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    html_url: 'https://github.com/company/repo/pull/43',
    head: { ref: 'fix/auth-bug' },
    base: { ref: 'main' },
    additions: 25,
    deletions: 10,
    changed_files: 3,
    review_comments: 2,
    requested_reviewers: []
  }
];

export const mockJiraIssues = [
  {
    id: '10001',
    key: 'PROJ-123',
    summary: 'Payment service architecture decision',
    status: 'In Progress',
    priority: 'High',
    updated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    url: 'https://company.atlassian.net/browse/PROJ-123'
  },
  {
    id: '10002',
    key: 'PROJ-124',
    summary: 'API rate limiting implementation',
    status: 'To Do',
    priority: 'Medium',
    updated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    url: 'https://company.atlassian.net/browse/PROJ-124'
  },
  {
    id: '10003',
    key: 'PROJ-125',
    summary: 'Database migration script',
    status: 'Done',
    priority: 'Low',
    updated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    url: 'https://company.atlassian.net/browse/PROJ-125'
  }
];

export const mockCalendarEvents = [
  {
    id: 'event1',
    summary: 'Standup',
    start: {
      dateTime: new Date(new Date().setHours(9, 30, 0, 0)).toISOString()
    },
    location: 'Zoom'
  },
  {
    id: 'event2',
    summary: 'Sprint Planning',
    start: {
      dateTime: new Date(new Date().setHours(10, 0, 0, 0)).toISOString()
    },
    location: 'Conference Room A',
    description: '3 tickets at risk · migration thread unresolved'
  },
  {
    id: 'event3',
    summary: '1:1 with Sarah',
    start: {
      dateTime: new Date(new Date().setHours(11, 30, 0, 0)).toISOString()
    },
    location: 'Her desk',
    description: 'Unread design doc she shared yesterday'
  },
  {
    id: 'event4',
    summary: 'Focus Time',
    start: {
      dateTime: new Date(new Date().setHours(13, 0, 0, 0)).toISOString()
    }
  },
  {
    id: 'event5',
    summary: '1:1 with Manager',
    start: {
      dateTime: new Date(new Date().setHours(14, 30, 0, 0)).toISOString()
    },
    location: 'Manager office',
    description: 'You noted: bring up headcount ask'
  }
];

