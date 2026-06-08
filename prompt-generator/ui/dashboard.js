import { checkSessionOrRedirect, bindCommonNavbar } from './common.js';

const dom = {};

function cacheDom() {
  dom.topbarBrandLink = document.getElementById('topbarBrandLink');
}

function bindEvents() {
  if (dom.topbarBrandLink) {
    dom.topbarBrandLink.addEventListener('click', (event) => {
      event.preventDefault();
      // On dashboard, clicking the brand link just reloads or keeps current page
      window.location.reload();
    });
  }
}

async function init() {
  const session = await checkSessionOrRedirect();
  if (!session) return; // Redirecting...

  cacheDom();
  bindEvents();
  bindCommonNavbar(session.user, session.isGuest);
}

document.addEventListener('DOMContentLoaded', init);
