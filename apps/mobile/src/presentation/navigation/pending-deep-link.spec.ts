import {
  setPendingDeepLink,
  consumePendingDeepLink,
  _resetPendingDeepLinkForTests,
} from './pending-deep-link';

describe('pending-deep-link', () => {
  beforeEach(() => {
    _resetPendingDeepLinkForTests();
  });

  it('returns null when nothing is staged', () => {
    expect(consumePendingDeepLink('ParentHome')).toBeNull();
    expect(consumePendingDeepLink('More')).toBeNull();
  });

  it('returns and clears the staged target on first consume', () => {
    setPendingDeepLink({
      stack: 'ParentHome',
      chain: [{ screen: 'ChildDetail', params: { studentId: 's1', fullName: 'Aarav' } }],
    });

    const first = consumePendingDeepLink('ParentHome');
    expect(first).not.toBeNull();
    expect(first?.chain).toHaveLength(1);
    expect(first?.chain[0]?.screen).toBe('ChildDetail');

    // Second consume on the same stack returns null — the contract is
    // single-use to prevent re-firing on subsequent useFocusEffect runs.
    expect(consumePendingDeepLink('ParentHome')).toBeNull();
  });

  it('returns null when consuming the wrong stack', () => {
    setPendingDeepLink({
      stack: 'More',
      chain: [{ screen: 'EnquiryList' }, { screen: 'EnquiryDetail', params: { enquiryId: 'e1' } }],
    });

    // ChildrenListScreen consumes 'ParentHome' — the More-targeted chain
    // must not be picked up by the parent stack consumer.
    expect(consumePendingDeepLink('ParentHome')).toBeNull();

    // The correct consumer still sees it.
    const consumed = consumePendingDeepLink('More');
    expect(consumed?.chain).toHaveLength(2);
  });

  it('replaces the staged target when a second tap arrives (latest-wins)', () => {
    setPendingDeepLink({
      stack: 'ParentHome',
      chain: [{ screen: 'ChildDetail', params: { studentId: 's1' } }],
    });
    setPendingDeepLink({
      stack: 'ParentHome',
      chain: [{ screen: 'ChildDetail', params: { studentId: 's2' } }],
    });

    const consumed = consumePendingDeepLink('ParentHome');
    expect(consumed?.chain[0]?.params?.['studentId']).toBe('s2');
  });

  it('preserves chain order so consumers push parents before leaves', () => {
    setPendingDeepLink({
      stack: 'More',
      chain: [{ screen: 'EnquiryList' }, { screen: 'EnquiryDetail', params: { enquiryId: 'e1' } }],
    });

    const consumed = consumePendingDeepLink('More');
    expect(consumed?.chain.map((s) => s.screen)).toEqual(['EnquiryList', 'EnquiryDetail']);
  });
});
