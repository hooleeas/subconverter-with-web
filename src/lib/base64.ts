import type {Node} from './types.js';
export const toBase64=(nodes:Node[])=>Buffer.from(nodes.map(n=>`${n.type}://${n.server}:${n.port}#${encodeURIComponent(n.name)}`).join('\n')).toString('base64');
