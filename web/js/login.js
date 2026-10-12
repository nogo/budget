// The login screen: wallet, "Budget" and one button to the identity
// provider. Shown whenever there is no session.
import { AurilElement, html } from '../auril/index.js';
import { t } from './i18n.js';
import { icon } from './icons.js';

class LoginScreen extends AurilElement {
  onConnect() {
    this.watch((s) => s.lang, () => this.update());
  }

  render() {
    return html`<main class="login">
      <h1 class="login-title">${icon('wallet')}<span>Budget</span></h1>
      <a class="button primary login-button" href="/auth/login">${t('login')}</a>
    </main>`;
  }
}
customElements.define('login-screen', LoginScreen);
