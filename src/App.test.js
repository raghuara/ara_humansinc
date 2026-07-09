import store from './redux/store';
import { loginSuccess, logout } from './redux/slices/authSlice';

// Smoke test for the store wiring. (Full App render is exercised via the
// running dev server; react-router v7 + CRA's Jest resolver don't get along,
// so we avoid importing the router here.)
test('auth starts logged out, then login/logout flips isAuthenticated', () => {
  expect(store.getState().auth.isAuthenticated).toBe(false);
  expect(store.getState().sidebar.isExpanded).toBe(true);

  store.dispatch(loginSuccess({ token: 't', userName: 'demo' }));
  expect(store.getState().auth.isAuthenticated).toBe(true);
  expect(store.getState().auth.userName).toBe('demo');

  store.dispatch(logout());
  expect(store.getState().auth.isAuthenticated).toBe(false);
});
