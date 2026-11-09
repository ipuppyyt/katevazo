export function Privacy() {
  return (
    <div className="page">
      <div className="container narrow prose">
        <p className="eyebrow">Privacy</p>
        <h1 className="page-title">Privacy policy</h1>
        <p>
          This policy covers the <strong>Send to Katevazo</strong> browser extension (Chrome, Edge and Firefox). Last updated:
          31 October 2026.
        </p>

        <h2>The short version</h2>
        <p>The extension does not collect, store, share or sell any personal data, and it makes no network requests of its own.</p>

        <h2>What it does</h2>
        <p>
          The extension sends the page you are viewing, or a link you choose, to the Katevazo desktop app on your own computer.
          It does this by opening a <code>katevazo://</code> address, which your operating system hands to the app.
        </p>
        <ul>
          <li>When you click the toolbar button, a popup shows the title and address of the current tab, using the <code>activeTab</code> permission, and passes the address to the app if you press Send.</li>
          <li>When you use a right-click menu entry, it passes that page or link to the app. This uses the <code>contextMenus</code> permission.</li>
          <li>On <code>www.youtube.com</code> watch pages it adds a download button to the video player, and on Shorts a Download button beside Share. The page script reads only the address of the video you are watching, and only when you click the button.</li>
          <li>On <code>www.instagram.com</code> it adds a download button to video posts and reels from public accounts. It skips accounts that Instagram marks as private. The page script reads only the address of the post, and only when you click the button.</li>
          <li>It uses the <code>nativeMessaging</code> permission only to ask the Katevazo app on your own computer whether it is installed. The app answers with its version number; nothing else is exchanged, and nothing leaves your computer.</li>
        </ul>

        <h2>What it does not do</h2>
        <ul>
          <li>It does not collect browsing history, page content, account details or any other personal data.</li>
          <li>It does not use analytics, advertising, tracking or remote code.</li>
          <li>It does not send anything to any server. The link goes only to the Katevazo app on your computer, which loads it so you can choose a format. Nothing downloads until you press Download in the app.</li>
          <li>It stores nothing, apart from what your browser keeps for any installed extension.</li>
        </ul>

        <h2>Changes</h2>
        <p>If this policy changes, the updated version will be published at this address with a new date.</p>

        <h2>Contact</h2>
        <p>
          Questions can be raised at <a href="https://github.com/ipuppyyt/katevazo/issues">github.com/ipuppyyt/katevazo/issues</a>.
        </p>
      </div>
    </div>
  );
}
