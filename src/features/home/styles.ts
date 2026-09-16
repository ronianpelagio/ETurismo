import { Dimensions, Platform, StyleSheet } from 'react-native';
import { THEMES, type ThemeName } from '../../constants/themes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 12;

// ─── Theme ───────────────────────────────────────────────────────────────────────
export function buildC(t: typeof THEMES[ThemeName]) {
  return {
    backgroundLight: t.bg, surfaceLight: t.surface,
    textPrimary: t.ink, textSecondary: t.inkMid, textMuted: t.inkDim,
    accent: t.gold, accentWarm: t.goldBright, accentLight: t.goldSoft,
    success: t.teal, crimson: t.crimson,
    borderSubtle: t.border, divider: t.deep, hoverLight: t.overlay,
    shadowLight: t.ink, overlay: t.goldSoft,
    void: t.bg, ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldBright: t.goldBright, borderGold: t.borderGold, goldSoft: t.goldSoft,
    raised: t.raised, surface: t.surface, border: t.border,
    teal: t.teal, deep: t.deep, over: t.overlay,
  };
}
// ─── Styles ───────────────────────────────────────────────────────────────────────
export function getStyles(C: ReturnType<typeof buildC>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.void },
    centerScreen: { justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingBottom: 130 },

    // ── Toast ──
    toastWrapper: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 58 : 48,
      left: 0, right: 0, alignItems: 'center', zIndex: 999,
    },
    toast: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: C.raised,
      borderWidth: 1, borderColor: C.borderGold,
      paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50,
      shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 12, elevation: 10,
    },
    toastDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold },
    toastText: { fontSize: 13, color: C.inkMid, fontWeight: '500' },
    toastName: { color: C.ink, fontWeight: '700' },

    // ── Loading ──
    loadingInner: { alignItems: 'center', gap: 12 },
    loadingOrb: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: C.raised, borderWidth: 1, borderColor: C.borderGold,
      justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    loadingEyebrow: { fontSize: 10, letterSpacing: 3, color: C.gold, fontWeight: '700' },
    loadingText: { fontSize: 15, color: C.inkMid },
    loadingDots: { flexDirection: 'row', gap: 6, marginTop: 8 },
    loadingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold },

    // ── Error ──
    errorInner: { alignItems: 'center', gap: 14, padding: 40 },
    errorGlyph: { fontSize: 36, color: C.gold, marginBottom: 4 },
    errorTitle: { fontSize: 22, fontWeight: '700', color: C.ink },
    errorBody: { fontSize: 14, color: C.inkMid, textAlign: 'center', lineHeight: 22 },
    retryBtn: {
      marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: C.gold, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50,
    },
    retryText: { fontSize: 14, fontWeight: '700', color: C.void },

    // ═══════════════════════════════════════════════════════════
    // HERO
    // ═══════════════════════════════════════════════════════════
    hero: {
      height: 260,
      overflow: 'hidden',
      position: 'relative',
    },
    heroBgImage: { resizeMode: 'cover' },
    heroOverlay: {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(12,9,6,0.52)',
    },
    heroTopBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 0,
    },
    heroLogoGroup: {},
    heroLogo: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 2.5,
    },
    heroLogoSub: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 7,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginTop: 2,
    },
    heroProfileBtn: {
      width: 40, height: 40, borderRadius: 20,
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    },
    heroProfileImage: { width: '100%', height: '100%' },
    heroProfileInitial: { color: '#fff', fontSize: 15, fontWeight: '800' },
    heroBody: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingBottom: 22,
    },
    heroGreeting: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 4,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: -0.8,
      lineHeight: 36,
    },
    heroTitleAccent: { color: C.gold },

    // ═══════════════════════════════════════════════════════════
    // SEARCH
    // ═══════════════════════════════════════════════════════════
    searchSection: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    searchBar: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    searchBarFocused: { borderColor: C.borderGold },
    searchInput: { flex: 1, color: C.ink, fontSize: 14, padding: 0 },
    searchResultText: {
      fontSize: 11, color: C.inkDim, marginTop: 8, fontStyle: 'italic', paddingHorizontal: 4,
    },
    recentRow: {
      flexDirection: 'row', flexWrap: 'nowrap', gap: 7,
      marginTop: 10,
    },
    recentLabel: {
      fontSize: 9, color: C.inkDim, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6,
    },
    recentChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50,
    },
    recentChipText: { fontSize: 11, color: C.inkMid },

    // ═══════════════════════════════════════════════════════════
    // SECTION HEADER
    // ═══════════════════════════════════════════════════════════
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginTop: 24,
      marginBottom: 14,
    },
    sectionEyebrow: {
      fontSize: 9,
      letterSpacing: 2.5,
      color: C.gold,
      fontWeight: '800',
      marginBottom: 3,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: C.ink,
      letterSpacing: -0.5,
    },
    sectionAction: {
      fontSize: 11,
      color: C.gold,
      fontWeight: '700',
    },

    // ═══════════════════════════════════════════════════════════
    // FEATURED CARD
    // ═══════════════════════════════════════════════════════════
    featuredCard: {
      marginHorizontal: 20,
      height: 220,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: C.borderGold,
    },
    featuredImage: {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      width: '100%',
      height: '100%',
    },
    featuredOverlay: {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(10,8,5,0.5)',
    },
    featuredContent: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 18,
    },
    featuredBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.gold,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 50,
      marginBottom: 10,
      gap: 5,
    },
    featuredBadgeDot: {
      width: 5, height: 5, borderRadius: 3, backgroundColor: C.void,
    },
    featuredBadgeText: {
      color: C.void, fontSize: 8, fontWeight: '900', letterSpacing: 1,
    },
    featuredTitle: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.5,
      lineHeight: 28,
    },
    featuredCat: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 11,
      marginTop: 4,
    },
    featuredArrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    featuredArrowText: {
      color: '#fff', fontSize: 11, fontWeight: '700',
    },
    featuredArrowBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.gold,
      alignItems: 'center', justifyContent: 'center',
    },

    // ═══════════════════════════════════════════════════════════
    // CATEGORY TABS
    // ═══════════════════════════════════════════════════════════
    tabsScrollContent: {
      paddingHorizontal: 20,
      gap: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: C.border,
    },
    tabActive: {
      backgroundColor: C.gold,
      borderColor: C.gold,
    },
    tabText: { fontSize: 12, fontWeight: '600', color: C.inkMid },
    tabTextActive: { color: C.void },

    // ═══════════════════════════════════════════════════════════
    // COLLECTION GRID
    // ═══════════════════════════════════════════════════════════
    grid: { paddingHorizontal: 20 },
    gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP, alignItems: 'stretch' },
    countBadge: {
      backgroundColor: C.overlay, borderWidth: 1, borderColor: C.borderGold,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
    },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: C.gold },

    // ── Card ──
    card: {
      backgroundColor: C.surface, borderRadius: 16,
      overflow: 'hidden', borderWidth: 1, borderColor: C.border, flex: 1,
    },
    cardImageWrap: { width: '100%', aspectRatio: 1, position: 'relative' },
    cardImage: { width: '100%', height: '100%' },
    cardScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
    cardCatPill: {
      position: 'absolute', top: 8, left: 8,
      backgroundColor: 'rgba(235,219,204,0.88)',
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
      borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    },
    cardCatText: { fontSize: 8, fontWeight: '800', color: C.gold, letterSpacing: 1 },
    cardBottomRow: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 4 },
    cardLivePill: {
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: 'rgba(46,204,113,0.2)', borderWidth: 1,
      borderColor: 'rgba(46,204,113,0.4)', justifyContent: 'center', alignItems: 'center',
    },
    cardLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
    cardMicroBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    cardNewBadge: {
      position: 'absolute', top: 8, right: 8,
      backgroundColor: C.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    },
    cardNewBadgeText: { fontSize: 7, fontWeight: '900', color: C.void, letterSpacing: 1 },
    cardBody: { padding: 12, gap: 5, minHeight: 66 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: C.ink, lineHeight: 17, minHeight: 34 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardAccentLine: { width: 14, height: 1.5, backgroundColor: C.gold, borderRadius: 1, opacity: 0.7 },
    cardDate: { fontSize: 10, color: C.inkDim, fontWeight: '500' },

    // ── Empty ──
    emptyState: { alignItems: 'center', paddingVertical: 50, gap: 10 },
    emptyGlyph: { fontSize: 28, color: C.inkDim, marginBottom: 4 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
    emptySub: { fontSize: 12, color: C.inkDim, textAlign: 'center' },

    // ── Skeleton ──
    skeletonCard: {
      backgroundColor: C.border, borderRadius: 16, overflow: 'hidden', marginBottom: 2,
    },

    // ═══════════════════════════════════════════════════════════
    // NEWS / FEED CARDS
    // ═══════════════════════════════════════════════════════════
    newsScroll: { paddingHorizontal: 20, gap: 10 },
    feedCardCompact: {
      width: 240,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, marginRight: 10, overflow: 'hidden',
    },
    feedCardCompactContent: { padding: 14, gap: 6 },
    feedCardCompactHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    feedCardCompactBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 50,
    },
    feedCardCompactBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.6 },
    feedCardCompactDate: { fontSize: 9, color: C.inkDim },
    feedCardCompactTitle: { fontSize: 13, fontWeight: '700', color: C.ink, lineHeight: 18 },
    feedCardCompactDesc: { fontSize: 11, color: C.inkMid, lineHeight: 15 },
    feedCardCompactFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    feedCardCompactFooterText: { fontSize: 9, color: C.inkDim },
    feedCardCompactDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: C.inkDim, opacity: 0.5 },
    updateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.crimson },

    // ── Full feed cards (modal) ──
    feedCard: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 16, overflow: 'hidden',
    },
    feedCardImage: { width: '100%', height: 160 },
    feedCardBody: { padding: 16, gap: 8 },
    feedTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    feedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      borderWidth: 1,
    },
    feedBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
    interestedBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50,
    },
    interestedBtnActive: {
      backgroundColor: 'rgba(231, 76, 60, 0.1)',
      borderColor: 'rgba(231, 76, 60, 0.3)',
    },
    interestedBtnText: { fontSize: 10, fontWeight: '600', color: C.inkMid },
    interestedBtnTextActive: { color: '#E74C3C' },
    feedTitle: { fontSize: 14, fontWeight: '700', color: C.ink, lineHeight: 20 },
    feedDesc: { fontSize: 12, color: C.inkMid, lineHeight: 18 },
    feedFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    feedFooterText: { fontSize: 11, color: C.inkDim, fontWeight: '500' },
    feedFooterDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.inkDim, opacity: 0.5 },

    // ═══════════════════════════════════════════════════════════
    // VISIT CARD
    // ═══════════════════════════════════════════════════════════
    visitCard: {
      marginHorizontal: 20,
      marginTop: 8,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#1A1510',
    },
    visitCardImage: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      opacity: 0.18,
    },
    visitCardBody: { padding: 20 },
    visitTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    visitEyebrow: { color: C.gold, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
    visitTitle: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 26, letterSpacing: -0.4 },
    visitLocationIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(201,168,76,0.15)',
      borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
      alignItems: 'center', justifyContent: 'center',
    },
    visitInfoGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    visitInfoBlock: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    visitInfoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    visitInfoValue: { color: '#fff', fontSize: 11, fontWeight: '600', lineHeight: 16 },
    visitBtn: {
      height: 48,
      borderRadius: 12,
      backgroundColor: C.gold,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    visitBtnText: { color: '#1A1510', fontSize: 13, fontWeight: '900' },

    // ═══════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════
    footer: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      marginTop: 4,
    },
    footerLogo: { color: C.inkDim, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    footerLine: { width: 40, height: 1, backgroundColor: C.border, marginVertical: 12 },
    footerCopyright: { color: C.inkDim, fontSize: 10, textAlign: 'center', lineHeight: 16 },

    // ═══════════════════════════════════════════════════════════
    // MODALS (shared base)
    // ═══════════════════════════════════════════════════════════
    modalWrap: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'flex-end', zIndex: 200,
    },
    modalBackdrop: {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(8,7,6,0.72)',
    },
    modalHandle: {
      width: 36, height: 3.5, borderRadius: 2, backgroundColor: C.inkDim,
      alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    modalCloseBtn: {
      position: 'absolute', top: 14, right: 16, zIndex: 10,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
      justifyContent: 'center', alignItems: 'center',
    },

    // ═══════════════════════════════════════════════════════════
    // ARTIFACT DETAIL MODAL
    // ═══════════════════════════════════════════════════════════
    modalSheet: {
      backgroundColor: C.deep,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      maxHeight: SCREEN_HEIGHT * 0.93,
      borderTopWidth: 1, borderColor: C.border,
    },
    modalHero: { width: '100%', height: SCREEN_HEIGHT * 0.28, position: 'relative', backgroundColor: '#000' },
    modalHeroImg: { width: '100%', height: '100%' },
    modalHeroScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,7,6,0.3)' },
    modalHeroCatPill: {
      position: 'absolute', bottom: 16, left: 18,
      backgroundColor: 'rgba(8,7,6,0.85)',
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50,
      borderWidth: 1, borderColor: C.borderGold,
    },
    modalHeroCatText: { fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 2.5 },
    modalHeroLive: {
      position: 'absolute', top: 16, right: 16,
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(8,7,6,0.75)',
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
      borderWidth: 1, borderColor: 'rgba(46,204,113,0.3)',
    },
    pulseRing: {
      position: 'absolute', width: 10, height: 10, borderRadius: 5,
      backgroundColor: C.teal, opacity: 0,
    },
    modalHeroLiveText: { fontSize: 9, fontWeight: '800', color: C.teal, letterSpacing: 2 },
    modalBody: { padding: 24 },
    modalGoldAccent: { width: 30, height: 2, backgroundColor: C.gold, borderRadius: 1, marginBottom: 16 },
    modalTitle: { fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -0.8, marginBottom: 4 },
    modalDate: { fontSize: 12, color: C.inkDim, fontStyle: 'italic', marginBottom: 12 },
    modalFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
    modalFactChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50,
      backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold,
    },
    modalFactText: { fontSize: 10, fontWeight: '700', color: C.inkMid },
    modalActions: { flexDirection: 'row', gap: 10, marginBottom: 28 },
    modalActionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 7,
      paddingVertical: 12, borderRadius: 50,
      backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
    },
    modalActionBtnGold: { backgroundColor: C.gold, borderColor: C.gold },
    modalActionText: { fontSize: 13, fontWeight: '700', color: C.inkMid },
    modalActionTextDark: { color: C.void },
    modalSection: { marginBottom: 28 },
    modalSectionLabel: { fontSize: 9, letterSpacing: 3.5, color: C.gold, fontWeight: '800', marginBottom: 8 },
    modalSectionUnderline: {
      width: 24, height: 1.5, backgroundColor: C.gold, opacity: 0.5, borderRadius: 1, marginBottom: 14,
    },
    modalDesc: { fontSize: 14.5, color: C.inkMid, lineHeight: 24 },

    // Audio
    audioLangRow: { flexDirection: 'row', gap: 8 },
    audioLangChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
      backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
    },
    audioLangChipActive: { borderColor: C.borderGold, backgroundColor: C.goldSoft },
    audioLangLabel: { fontSize: 11, fontWeight: '700' as const, color: C.inkDim },
    audioLangLabelActive: { color: C.gold },

    // ═══════════════════════════════════════════════════════════
    // FEED MODAL
    // ═══════════════════════════════════════════════════════════
    feedModalSheet: {
      backgroundColor: C.deep,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      borderTopWidth: 1, borderColor: C.border,
      maxHeight: SCREEN_HEIGHT * 0.9,
    },
    feedModalHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 10,
      borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    feedModalTabs: { flex: 1, flexDirection: 'row', gap: 8 },
    feedModalTab: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
      backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
    },
    feedModalTabActive: { backgroundColor: C.gold, borderColor: C.gold },
    feedModalTabText: { fontSize: 12, fontWeight: '700', color: C.inkMid },
    feedModalTabTextActive: { color: C.void },
    feedModalTabCount: {
      backgroundColor: C.overlay, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2,
    },
    feedModalTabCountActive: { backgroundColor: 'rgba(0,0,0,0.15)' },
    feedModalTabCountText: { fontSize: 10, fontWeight: '800', color: C.inkDim },
    feedModalTabCountTextActive: { color: C.void },
    feedModalList: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },

    // ═══════════════════════════════════════════════════════════
    // PROFILE SHEET
    // ═══════════════════════════════════════════════════════════
    profileSheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      borderTopWidth: 1, borderColor: C.border, paddingBottom: 40,
    },
    profileSheetBody: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, gap: 6 },
    profileSheetAvatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: C.goldSoft, borderWidth: 2, borderColor: C.gold,
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    profileSheetInitial: { fontSize: 32, fontWeight: '800', color: C.gold },
    profileSheetName: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
    profileSheetEmail: { fontSize: 13, color: C.inkDim, marginBottom: 20 },
    profileSheetStats: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.hoverLight ?? C.border,
      borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24,
      gap: 20, width: '100%', justifyContent: 'center',
    },
    profileSheetStat: { alignItems: 'center', gap: 4 },
    profileSheetStatVal: { fontSize: 22, fontWeight: '900', color: C.ink },
    profileSheetStatLbl: { fontSize: 10, color: C.inkDim, fontWeight: '600', letterSpacing: 0.5 },
    profileSheetStatDiv: { width: 1, height: 32, backgroundColor: C.border },

    // ═══════════════════════════════════════════════════════════
    // MAP MODAL
    // ═══════════════════════════════════════════════════════════
    mapModalSheet: {
      backgroundColor: C.deep,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      borderTopWidth: 1, borderColor: C.border,
      overflow: 'hidden',
      height: SCREEN_HEIGHT * 0.88,
    },
    mapModalHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: C.divider, gap: 12,
    },
    mapModalTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
    mapView: { flex: 1 },
    mapInfoStrip: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: C.divider, gap: 10,
    },
    mapInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    mapInfoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: C.inkDim, marginBottom: 2 },
    mapInfoValue: { fontSize: 12, fontWeight: '700', color: C.ink },
    mapOpenExtBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: C.gold, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    },
    mapOpenExtBtnText: { color: C.void, fontSize: 12, fontWeight: '900' },
    mapLocatingOverlay: {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    mapLocatingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    mapLocatingSubText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },
    mapDivider: { width: 1, height: 30, backgroundColor: C.divider },
  });
}


// Widget styles (static, don't depend on theme to avoid re-create on scroll)
export const widgetS = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 14, marginTop: 28,
  },
  eyebrow: {
    fontSize: 10, letterSpacing: 2.5, fontWeight: '700',
    color: '#A0640A', marginBottom: 3,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1612', letterSpacing: -0.4 },
  unreadPill: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C',
    marginBottom: 2,
  },
  // card container
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EAE4DA',
    overflow: 'hidden',
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  // tab switcher
  tabRow: {
    flexDirection: 'row',
    margin: 10,
    backgroundColor: '#F7F4EF',
    borderRadius: 14,
    padding: 3,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 3, bottom: 3,
    width: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
    paddingVertical: 9, paddingHorizontal: 6,
    zIndex: 1,
  },
  tabLabel: { fontSize: 12, fontWeight: '500', color: '#A89F96' },
  tabCount: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20,
  },
  tabCountText: { fontSize: 10, fontWeight: '700' },
  // announcement cards
  annoCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE4DA',
    overflow: 'hidden',
  },
  annoImage: { width: '100%', height: 110 },
  annoImagePlaceholder: {
    width: '100%', height: 90,
    backgroundColor: 'rgba(160,100,10,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  annoBody: { padding: 13, gap: 5 },
  annoTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  annoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(160,100,10,0.1)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 50,
  },
  annoBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  annoTime: { fontSize: 10, color: '#A89F96' },
  annoTitle: { fontSize: 14, fontWeight: '700', color: '#1A1612', lineHeight: 20 },
  annoDesc: { fontSize: 12, color: '#6B6459', lineHeight: 17 },
  annoFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  annoFooterText: { fontSize: 10, color: '#A89F96' },
  annoFooterDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D4CFC9' },
  seeAllTile: {
    width: 72, borderRadius: 16,
    backgroundColor: 'rgba(160,100,10,0.07)',
    borderWidth: 1, borderColor: 'rgba(160,100,10,0.15)',
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  seeAllIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(160,100,10,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  seeAllText: { fontSize: 11, fontWeight: '700' },
  dotRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 5, paddingBottom: 12,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D4CFC9' },
  dotActive: { backgroundColor: '#A0640A', width: 14 },
  // events timeline
  eventRow: { flexDirection: 'row', gap: 12 },
  timeline: { width: 20, alignItems: 'center', paddingTop: 3 },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotInner: { width: 7, height: 7, borderRadius: 4 },
  timelineLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 2 },
  eventCard: {
    flex: 1, backgroundColor: '#F7F4EF',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#EAE4DA',
    marginBottom: 10, gap: 4,
  },
  eventCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: '#1A1612', lineHeight: 18 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  eventMetaText: { fontSize: 10, color: '#A89F96' },
  countdownChip: {
    borderWidth: 1, borderRadius: 50,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  countdownText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  eventDesc: { fontSize: 11, color: '#6B6459', lineHeight: 16 },
  eventFooter: { alignItems: 'flex-end', marginTop: 2 },
  eventDetailsLink: { fontSize: 11, fontWeight: '700' },
  seeAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#EAE4DA',
    marginHorizontal: -16, paddingHorizontal: 16,
    marginBottom: 4,
  },
  seeAllRowText: { fontSize: 12, fontWeight: '700' },
});
