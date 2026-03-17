import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const ciscoKey = new PluginKey('ciscoHighlight');

// Highlight rules — order matters (later rules overlay earlier)
const RULES = [
  // Comments: entire lines starting with !
  { pattern: /^!.*$/gm, className: 'cisco-comment' },

  // IP addresses (including optional CIDR)
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?\b/g, className: 'cisco-ip' },

  // Section headers
  { pattern: /^(interface|router|line|policy-map|class-map|route-map|vlan|ip vrf)\s+.*/gm, className: 'cisco-section' },

  // Commands
  { pattern: /\b(ip route|ip address|access-list|switchport|spanning-tree|ip nat|crypto|snmp-server|ntp server|logging|ip domain|ip name-server|ip dhcp|ip access-group|ip helper-address)\b/g, className: 'cisco-command' },

  // Status up keywords
  { pattern: /\b(up\/up|up|connected|enabled|active|established|success|no shutdown)\b/gi, className: 'cisco-status-up' },

  // Status down keywords
  { pattern: /\b(down\/down|administratively down|down|disabled|err-disabled|inactive|notconnect|fail|error)\b/gi, className: 'cisco-status-down' },

  // Shutdown (without "no" prefix) — careful not to match "no shutdown"
  { pattern: /(?<!no\s)\bshutdown\b/gi, className: 'cisco-status-down' },

  // Permit/deny in ACLs
  { pattern: /\b(permit)\b/gi, className: 'cisco-status-up' },
  { pattern: /\b(deny)\b/gi, className: 'cisco-status-down' },

  // Standalone numbers (VLAN IDs, AS numbers, etc.)
  { pattern: /(?<=\s)\d+(?=\s|$)/gm, className: 'cisco-number' },
];

function buildDecorations(doc) {
  const decorations = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const text = node.text;
    if (!text) return;

    for (const rule of RULES) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const from = pos + match.index;
        const to = from + match[0].length;
        decorations.push(
          Decoration.inline(from, to, { class: rule.className })
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const CiscoHighlight = Extension.create({
  name: 'ciscoHighlight',

  addOptions() {
    return {
      enabled: false,
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;
    return [
      new Plugin({
        key: ciscoKey,
        state: {
          init(_, { doc }) {
            if (!extensionThis.options.enabled) return DecorationSet.empty;
            return buildDecorations(doc);
          },
          apply(tr, old, oldState, newState) {
            if (!extensionThis.options.enabled) return DecorationSet.empty;
            if (!tr.docChanged) return old;
            return buildDecorations(tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export default CiscoHighlight;
