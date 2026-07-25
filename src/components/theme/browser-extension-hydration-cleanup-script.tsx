const browserExtensionHydrationCleanupScript = `
(function () {
  function isExtensionAttribute(name) {
    return name === "bis_register" || name === "bis_skin_checked" || name.indexOf("__processed_") === 0 || name.indexOf("processed_") === 0;
  }

  function cleanElement(element) {
    if (!element || !element.attributes) return;
    for (var index = element.attributes.length - 1; index >= 0; index -= 1) {
      var name = element.attributes[index].name;
      if (isExtensionAttribute(name)) {
        element.removeAttribute(name);
      }
    }
  }

  function cleanTree(root) {
    cleanElement(root);
    if (!root || !root.querySelectorAll) return;
    var elements = root.querySelectorAll("*");
    for (var index = 0; index < elements.length; index += 1) {
      cleanElement(elements[index]);
    }
  }

  try {
    cleanTree(document.documentElement);
    if (!window.MutationObserver) return;

    var observer = new MutationObserver(function (mutations) {
      for (var index = 0; index < mutations.length; index += 1) {
        var mutation = mutations[index];
        if (mutation.type === "attributes") cleanElement(mutation.target);
        for (var nodeIndex = 0; nodeIndex < mutation.addedNodes.length; nodeIndex += 1) {
          var node = mutation.addedNodes[nodeIndex];
          if (node.nodeType === 1) cleanTree(node);
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    window.setTimeout(function () {
      cleanTree(document.documentElement);
      observer.disconnect();
    }, 3000);
  } catch (error) {
    // Browser extension cleanup is best-effort only.
  }
})();
`;

export function BrowserExtensionHydrationCleanupScript() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return <script>{browserExtensionHydrationCleanupScript}</script>;
}
