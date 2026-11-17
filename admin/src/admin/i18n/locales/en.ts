const en = {
  nav: {
    dashboard: "Dashboard",
    artifacts: "Artifacts",
    users: "Users",
    announcements: "Announcements",
    events: "Events",
    feedback: "Feedback",
    recentLogs: "Recent Logs",
    settings: "Settings",
  },

  common: {
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    loading: "Loading…",
    noData: "No data yet",
    actions: "Actions",
    close: "Close",
    back: "Back",
    next: "Next",
    yes: "Yes",
    no: "No",
    or: "or",
    all: "All",
    saving: "Saving…",
    refresh: "Refresh",
    publish: "Publish",
    create: "Create",
    saveChanges: "Save changes",
    addNew: "Add new",
    noName: "No name",
    preview: "Preview:",
    uploading: "Uploading...",
    imageUploaded: "Image uploaded — click to replace",
    clickToChoose: "Click to choose a file",
    imageFormats: "JPEG, PNG, WEBP, GIF, BMP, SVG · max 10 MB",
    previewNotAvailable: "Preview not available",
    upload: "Upload",
    url: "URL",
    coverImage: "Cover image",
    noActivity: "No activity yet.",
    pageOf: "Page {{page}} of {{total}}",
    showing: "Showing {{from}}–{{to}} of {{total}}",
    results: "{{count}} result",
    results_plural: "{{count}} results",
  },

  settings: {
    eyebrow: "System",
    title: "Settings",
    description: "Control application preferences and system defaults.",
    saveChanges: "Save changes",
    saved: "Settings saved",
    tabs: {
      general: "General",
      preferences: "Preferences",
      appearance: "Appearance",
    },
    general: {
      museumName: "Museum name",
      defaultLanguage: "Admin language",
      timezone: "Timezone",
    },
    preferences: {
      notifications: "Notifications",
      notificationsDesc: "Email me when new ratings or accounts are created.",
      compactDensity: "Compact density",
      compactDensityDesc: "Reduce padding across tables and cards.",
    },
    appearance: {
      title: "Theme",
      light: "Light",
      dark: "Dark",
      system: "System",
    },
    confirmTitle: "Save settings",
    confirmDesc: "Apply these changes to {{name}}?",
    confirmLabel: "Confirm & save",
    language: {
      label: "Admin language",
      hint: "Changes the language of this admin panel immediately.",
    },
  },

  dashboard: {
    eyebrow: "Overview",
    welcome: "Welcome Admin, {{name}}",
    description:
      "A snapshot of visitors, content, and engagement across the collection.",
    totalVisitors: "Total Visitors",
    activeUsers: "Active Users",
    allTimeAccounts: "All-time accounts",
    activeInLast: "active in last 5 min",
    artifacts: "Artifacts",
    withQR: "{{count}} with QR",
    online: "Online",
    offline: "Offline",
    systemLive: "— system live",
    noSession: "— no active session",
    printReport: "Print Report",
    printDashboard: "Print Dashboard Report",
    visitorTrend: "Visitor trend",
    lastNDays: "Last {{n}} days",
    last30Days: "Last 30 days",
    last90Days: "Last 90 days",
    allTime: "All time",
    custom: "Custom",
    from: "From",
    to: "To",
    apply: "Apply",
    clear: "Clear",
    showingFrom: "Showing registrations from",
    toLabel: "to",
    today: "today",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    unknown: "Unknown",
    ageGroups: "Age groups",
    visitorLocations: "Visitor locations",
    locationsSubtitle: "Philippines by region · overseas by sub-region",
    visitorsBy: "Visitors by region",
    demographics: "Demographics",
    noLocationData: "No location data yet",
    unresolvedPH: "unresolved PH",
    international: "international",
    tourFeedback: "Tour Feedback",
    totalFeedback: "Total Feedback",
    thisWeek: "+{{count}} this week",
    avgTourRating: "Avg. Tour Rating",
    outOf5: "Out of 5.0",
    wouldRecommend: "Would Recommend",
    yesNo: "{{yes}} yes · {{no}} no",
    avgArtifactsExplored: "Avg. Artifacts Explored",
    perVisit: "Per visit",
    feedbackTrend: "Feedback trend",
    thisMonth: "{{count}} this month",
    ratingDistribution: "Rating distribution",
    breakdown: "Breakdown",
    visitType: "Visit type",
    howHeard: "How they heard about us",
    recentFeedback: "Recent feedback",
    noFeedbackYet: "No feedback yet",
    noDataYet: "No data yet",
    totalFeedbackCount: "{{count}} total",
    positiveComments: "Positive Comments",
    negativeComments: "Negative Comments / Areas to Improve",
    noWrittenComments: "No written comments provided.",
    howHeardAboutUs: "How they heard about us",
    artifactsExplored: "Artifacts explored",
  },

  users: {
    eyebrow: "Access Control",
    title: "Users",
    description: "Manage visitor accounts and admin access permissions.",
    searchPlaceholder: "Search users…",
    userCount: "{{count}} user",
    userCount_plural: "{{count}} users",
    noMatchingUsers: "No matching users",
    noUsersYet: "No users yet",
    tryDifferentSearch: "Try a different search term.",
    addFirstUser: "Add your first user to get started.",
    addUser: "Add user",
    editUser: "Edit user",
    updateDetails: "Update the user's details and permissions.",
    createAccount: "Create a new account for an admin or visitor.",
    table: {
      user: "User",
      role: "Role",
      status: "Status",
      joined: "Joined",
      actions: "Actions",
    },
    form: {
      email: "Email *",
      passwordNew: "New password (leave blank to keep current)",
      passwordRequired: "Password *",
      passwordMin: "Min. 6 characters",
      firstName: "First name *",
      lastName: "Last name *",
      gender: "Gender",
      selectGender: "Select gender",
      age: "Age",
      address: "Address",
      addressPlaceholder: "Street, City, Province",
      role: "Role",
      status: "Status",
    },
    actions: {
      edit: "Edit",
      demote: "Demote to user",
      promote: "Promote to admin",
      activate: "Activate",
      deactivate: "Deactivate",
      delete: "Delete",
    },
    createUser: "Create user",
    removeUser: "Remove user",
    removeConfirm: "Remove {{email}} from the database? This cannot be undone.",
    showingPage: "Showing {{from}}–{{to}} of {{total}} users",
    page: "Page {{page}} of {{total}}",
  },

  announcements: {
    eyebrow: "Content",
    title: "Announcements",
    description: "Publish notices and updates for museum visitors.",
    newAnnouncement: "New announcement",
    editAnnouncement: "Edit announcement",
    searchPlaceholder: "Search announcements…",
    count: "{{count}} announcement",
    count_plural: "{{count}} announcements",
    noMatchTitle: "No matches found",
    noItemsTitle: "No announcements yet",
    noItemsDesc: "Create your first announcement to keep visitors informed.",
    modalDesc: "Visitors will see this in their mobile app feed.",
    form: {
      title: "Title *",
      dateTime: "Date & Time *",
      description: "Description",
    },
    badges: {
      past: "Past",
      active: "Active",
      hasImage: "Has image",
    },
    deleteTitle: "Delete announcement",
    deleteDesc: 'Delete "{{title}}"? This cannot be undone.',
    saving: "Saving…",
    showing: "Showing {{from}}–{{to}} of {{total}} announcements",
    page: "Page {{page}} of {{total}}",
  },

  events: {
    eyebrow: "Programming",
    title: "Events",
    description: "Manage upcoming and past museum events.",
    addEvent: "Add event",
    editEvent: "Edit event",
    newEvent: "New event",
    searchPlaceholder: "Search events…",
    count: "{{count}} event",
    count_plural: "{{count}} events",
    noMatchTitle: "No matching events",
    noEventsTitle: "No events yet",
    noEventsDesc: "Schedule your first museum event.",
    modalDesc: "Fill in the details and add a cover image.",
    form: {
      eventName: "Event name *",
      dateTime: "Date & Time *",
      description: "Description",
    },
    badges: {
      past: "Past",
      upcoming: "Upcoming",
      interested: "{{count}} interested",
    },
    deleteTitle: "Delete event",
    deleteDesc: 'Delete "{{title}}"? This cannot be undone.',
    createEvent: "Create event",
    saving: "Saving…",
    showing: "Showing {{from}}–{{to}} of {{total}} events",
    page: "Page {{page}} of {{total}}",
  },

  feedback: {
    eyebrow: "User Feedback",
    title: "Tour Feedback",
    description:
      "All visitor feedback submitted after completing a tour. Click a row to see full details.",
    printReport: "Print Report",
    printFeedback: "Print Feedback Report",
    refresh: "Refresh",
    totalSubmissions: "Total Submissions",
    allTimeFeedback: "All-time feedback",
    avgRating: "Avg. Rating",
    outOf5: "Out of 5.0",
    wouldRecommend: "Would Recommend",
    visitorsRecommending: "Visitors recommending",
    thisWeek: "This Week",
    last7Days: "Submissions (last 7 days)",
    searchPlaceholder: "Search comments or visit type…",
    allRatings: "All ratings",
    allResponses: "All responses",
    wouldRecommendOption: "Would recommend",
    wouldNotRecommend: "Would not recommend",
    allVisitTypes: "All visit types",
    clearFilters: "Clear filters",
    noFeedbackFound: "No feedback found.",
    adjustFilters: "Try adjusting your filters or search query.",
    table: {
      date: "Date",
      rating: "Rating",
      visitType: "Visit type",
      recommend: "Recommend",
      artifacts: "Artifacts",
      comments: "Positive / Negative",
      sentiment: "Sentiment",
    },
    sentiment: {
      all: "All",
      positive: "Positive",
      neutral: "Neutral",
      negative: "Negative",
    },
    visitTypes: {
      solo: "Solo",
      couple: "Couple",
      family: "Family",
      group: "Group",
      school: "School",
    },
    showing: "Showing {{from}}–{{to}} of {{total}} results",
    page: "Page {{page}} of {{total}}",
  },

  artifacts: {
    historicalSignificance: "Historical Significance",
    historicalSignificancePlaceholder: "Brief note on historical significance.",
  },

  logs: {
    eyebrow: "Activity",
    title: "Recent Logs",
    description:
      "Latest activity across users, artifacts, ratings, events, and announcements.",
    refresh: "Refresh",
    noActivity: "No activity yet.",
    types: {
      user: "New User",
      artifact: "New Artifact",
      rating: "New Rating",
      event: "New Event",
      announcement: "Announcement",
    },
    filterAll: "All ({{count}})",
    filterType: "{{label}} ({{count}})",
    showing: "Showing {{from}}–{{to}} of {{total}} activities",
    page: "Page {{page}} of {{total}}",
  },
};

export default en;

export type Translations = {
  nav: {
    dashboard: string;
    artifacts: string;
    users: string;
    announcements: string;
    events: string;
    feedback: string;
    recentLogs: string;
    settings: string;
  };
  common: {
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    loading: string;
    noData: string;
    actions: string;
    close: string;
    back: string;
    next: string;
    yes: string;
    no: string;
    or: string;
    all: string;
    saving: string;
    refresh: string;
    publish: string;
    create: string;
    saveChanges: string;
    addNew: string;
    noName: string;
    preview: string;
    uploading: string;
    imageUploaded: string;
    clickToChoose: string;
    imageFormats: string;
    previewNotAvailable: string;
    upload: string;
    url: string;
    coverImage: string;
    noActivity: string;
    pageOf: string;
    showing: string;
    results: string;
    results_plural: string;
  };
  settings: {
    eyebrow: string;
    title: string;
    description: string;
    saveChanges: string;
    saved: string;
    tabs: { general: string; preferences: string; appearance: string };
    general: { museumName: string; defaultLanguage: string; timezone: string };
    preferences: {
      notifications: string;
      notificationsDesc: string;
      compactDensity: string;
      compactDensityDesc: string;
    };
    appearance: { title: string; light: string; dark: string; system: string };
    confirmTitle: string;
    confirmDesc: string;
    confirmLabel: string;
    language: { label: string; hint: string };
  };
  dashboard: {
    eyebrow: string;
    welcome: string;
    description: string;
    totalVisitors: string;
    activeUsers: string;
    allTimeAccounts: string;
    activeInLast: string;
    artifacts: string;
    withQR: string;
    online: string;
    offline: string;
    systemLive: string;
    noSession: string;
    printReport: string;
    printDashboard: string;
    visitorTrend: string;
    lastNDays: string;
    last30Days: string;
    last90Days: string;
    allTime: string;
    custom: string;
    from: string;
    to: string;
    apply: string;
    clear: string;
    showingFrom: string;
    toLabel: string;
    today: string;
    gender: string;
    male: string;
    female: string;
    other: string;
    unknown: string;
    ageGroups: string;
    visitorLocations: string;
    locationsSubtitle: string;
    visitorsBy: string;
    demographics: string;
    noLocationData: string;
    unresolvedPH: string;
    international: string;
    tourFeedback: string;
    totalFeedback: string;
    thisWeek: string;
    avgTourRating: string;
    outOf5: string;
    wouldRecommend: string;
    yesNo: string;
    avgArtifactsExplored: string;
    perVisit: string;
    feedbackTrend: string;
    thisMonth: string;
    ratingDistribution: string;
    breakdown: string;
    visitType: string;
    howHeard: string;
    recentFeedback: string;
    noFeedbackYet: string;
    noDataYet: string;
    totalFeedbackCount: string;
    positiveComments: string;
    negativeComments: string;
    noWrittenComments: string;
    howHeardAboutUs: string;
    artifactsExplored: string;
  };
  users: {
    eyebrow: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    userCount: string;
    userCount_plural: string;
    noMatchingUsers: string;
    noUsersYet: string;
    tryDifferentSearch: string;
    addFirstUser: string;
    addUser: string;
    editUser: string;
    updateDetails: string;
    createAccount: string;
    table: {
      user: string;
      role: string;
      status: string;
      joined: string;
      actions: string;
    };
    form: {
      email: string;
      passwordNew: string;
      passwordRequired: string;
      passwordMin: string;
      firstName: string;
      lastName: string;
      gender: string;
      selectGender: string;
      age: string;
      address: string;
      addressPlaceholder: string;
      role: string;
      status: string;
    };
    actions: {
      edit: string;
      demote: string;
      promote: string;
      activate: string;
      deactivate: string;
      delete: string;
    };
    createUser: string;
    removeUser: string;
    removeConfirm: string;
    showingPage: string;
    page: string;
  };
  announcements: {
    eyebrow: string;
    title: string;
    description: string;
    newAnnouncement: string;
    editAnnouncement: string;
    searchPlaceholder: string;
    count: string;
    count_plural: string;
    noMatchTitle: string;
    noItemsTitle: string;
    noItemsDesc: string;
    modalDesc: string;
    form: { title: string; dateTime: string; description: string };
    badges: { past: string; active: string; hasImage: string };
    deleteTitle: string;
    deleteDesc: string;
    saving: string;
    showing: string;
    page: string;
  };
  events: {
    eyebrow: string;
    title: string;
    description: string;
    addEvent: string;
    editEvent: string;
    newEvent: string;
    searchPlaceholder: string;
    count: string;
    count_plural: string;
    noMatchTitle: string;
    noEventsTitle: string;
    noEventsDesc: string;
    modalDesc: string;
    form: { eventName: string; dateTime: string; description: string };
    badges: { past: string; upcoming: string; interested: string };
    deleteTitle: string;
    deleteDesc: string;
    createEvent: string;
    saving: string;
    showing: string;
    page: string;
  };
  feedback: {
    eyebrow: string;
    title: string;
    description: string;
    printReport: string;
    printFeedback: string;
    refresh: string;
    totalSubmissions: string;
    allTimeFeedback: string;
    avgRating: string;
    outOf5: string;
    wouldRecommend: string;
    visitorsRecommending: string;
    thisWeek: string;
    last7Days: string;
    searchPlaceholder: string;
    allRatings: string;
    allResponses: string;
    wouldRecommendOption: string;
    wouldNotRecommend: string;
    allVisitTypes: string;
    clearFilters: string;
    noFeedbackFound: string;
    adjustFilters: string;
    table: {
      date: string;
      rating: string;
      visitType: string;
      recommend: string;
      artifacts: string;
      comments: string;
      sentiment: string;
    };
    sentiment: {
      all: string;
      positive: string;
      neutral: string;
      negative: string;
    };
    visitTypes: {
      solo: string;
      couple: string;
      family: string;
      group: string;
      school: string;
    };
    showing: string;
    page: string;
  };
  artifacts: {
    historicalSignificance: string;
    historicalSignificancePlaceholder: string;
  };
  logs: {
    eyebrow: string;
    title: string;
    description: string;
    refresh: string;
    noActivity: string;
    types: {
      user: string;
      artifact: string;
      rating: string;
      event: string;
      announcement: string;
    };
    filterAll: string;
    filterType: string;
    showing: string;
    page: string;
  };
};
