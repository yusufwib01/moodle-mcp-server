export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read(): Promise<string>;
}

export const allResources: ResourceDefinition[] = [];

export function listResources(resources: ResourceDefinition[]) {
  return resources.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readResource(
  resources: ResourceDefinition[],
  uri: string,
): Promise<Array<{ uri: string; mimeType: string; text: string }>> {
  const match = resources.find((r) => r.uri === uri);
  if (!match) {
    throw new Error(`Unknown resource: ${uri}`);
  }
  return [{ uri: match.uri, mimeType: match.mimeType, text: await match.read() }];
}
