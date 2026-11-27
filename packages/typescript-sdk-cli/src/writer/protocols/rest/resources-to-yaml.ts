import { Pair, Scalar, YAMLMap } from 'yaml'
import type { Body, Resource } from '../../../model/protocols/rest/contract.ts'
import { compareBytes, sortedByKey } from '../../contract-to-yaml.ts'

export function resourcesToYaml(resources: Array<Resource>): YAMLMap {
  const endpoints = new YAMLMap()
  const byPath = Map.groupBy(resources, (resource) => resource.path)
  for (const [path, own] of sortedByKey(byPath)) {
    const methods = new YAMLMap()
    const atPath = own
      .map((resource) => ({
        method: resource.method.toLowerCase(),
        resource,
      }))
      .sort((a, b) => compareBytes(a.method, b.method))
    for (const { method, resource } of atPath) {
      methods.add(new Pair(method, resourceToYaml(resource)))
    }
    endpoints.add(new Pair(path, methods))
  }
  return endpoints
}

function resourceToYaml(resource: Resource): YAMLMap {
  const interaction = new YAMLMap()
  if (resource.request) {
    interaction.add(new Pair('request', bodyToYaml(resource.request)))
  }
  const responses = new YAMLMap()
  const byStatus = [...resource.responses].sort((a, b) => a.status - b.status)
  for (const response of byStatus) {
    responses.add(new Pair(response.status, bodyToYaml(response)))
  }
  interaction.add(new Pair('responses', responses))
  return interaction
}

function bodyToYaml(body: Body): Scalar {
  return new Scalar(body.schema)
}
