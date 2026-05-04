import { StackActions } from '@react-navigation/native';

/**
 * Navigate "back" to a list screen by name, robust to entry path.
 *
 * Why: forms in MoreStack (StaffForm, BatchForm, AddEnquiry, AddEvent) can
 * be opened either via the list-then-FAB path (list is in stack history) or
 * via the global '+' FAB which pushes the form directly on top of MoreHome
 * (list is NOT in history). A naive `navigate('XList')` does the right
 * thing for the first path but pushes a fresh list on top of the form for
 * the second, leaving the form in the stack with stale state.
 *
 * Behaviour:
 *  - List in history → popTo it (preserves the existing list instance and
 *    its scroll/filter state).
 *  - List not in history → replace the current screen with a fresh list
 *    (the form is removed from the stack — no ghost screen left behind).
 *
 * Typed loosely (matching the codebase's `(navigation as any)` convention)
 * because callers receive `useNavigation()` results with a refined type
 * that doesn't structurally satisfy `NavigationProp<ParamListBase>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function popToOrReplaceList(navigation: any, listRouteName: string): void {
  const state = navigation?.getState?.() as
    | { routes: { name: string }[] }
    | undefined;
  const hasList = state?.routes?.some((r) => r.name === listRouteName);
  navigation.dispatch(
    hasList ? StackActions.popTo(listRouteName) : StackActions.replace(listRouteName),
  );
}
