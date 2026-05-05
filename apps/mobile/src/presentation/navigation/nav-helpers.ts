import { CommonActions, StackActions } from '@react-navigation/native';

/**
 * Navigate "back" to a list screen by name, robust to entry path.
 *
 * Why: forms in MoreStack (StaffForm, BatchForm, AddEnquiry, AddEvent) can
 * be opened either via the list-then-FAB path (list AND tab root are in
 * stack history) or via the global '+' FAB which pushes the form on top
 * of the tab — and depending on RN's nested-navigate behaviour from
 * outside the navigator, the tab root may or may not actually be in the
 * resulting stack. A naive `navigate('XList')` does the right thing for
 * the first path but produces a broken stack for the second:
 *  - if the form was the only screen → pushes the list on top, form stays
 *    in history as a ghost;
 *  - if the form was on top of the tab root → replaces the form, list is
 *    correct but `index === 0` may show false (parent snapshot lag).
 *
 * The fix: when the list isn't already in history AND a `rootRouteName`
 * is supplied, RESET the nested stack to exactly `[root, list]`. That
 * guarantees:
 *  - the list is on top (the user lands where they expect after submit),
 *  - the tab root is the one screen below it (so swiping/tapping back
 *    from the list goes to the tab root, AND the parent's tabPress
 *    handler can pop back to the root reliably because it's actually in
 *    the stack).
 *
 * Behaviour:
 *  - List in history → popTo it (preserves the existing list's scroll /
 *    filter state).
 *  - List not in history, root supplied → reset to [root, list].
 *  - List not in history, no root → fall back to replace(list) (legacy
 *    behaviour; produces a stack of only [list]).
 *
 * Typed loosely (matching the codebase's `(navigation as any)` convention)
 * because callers receive `useNavigation()` results with a refined type
 * that doesn't structurally satisfy `NavigationProp<ParamListBase>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function popToOrReplaceList(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any,
  listRouteName: string,
  rootRouteName?: string,
): void {
  const state = navigation?.getState?.() as
    | { routes: { name: string }[] }
    | undefined;
  const hasList = state?.routes?.some((r) => r.name === listRouteName);
  if (hasList) {
    navigation.dispatch(StackActions.popTo(listRouteName));
    return;
  }
  if (rootRouteName) {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: rootRouteName }, { name: listRouteName }],
      }),
    );
    return;
  }
  navigation.dispatch(StackActions.replace(listRouteName));
}
