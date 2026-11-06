import {
  createContactMessage,
  getPublicCollection,
  getPublicProfile,
} from './axiosClient.js'

export function getProfile(options) {
  return getPublicProfile(options)
}

export function getSkills(options) {
  return getPublicCollection('skills/', 'Skills', options)
}

export function getEducation(options) {
  return getPublicCollection('education/', 'Education', options)
}

export function getExperiences(options) {
  return getPublicCollection('experiences/', 'Experiences', options)
}

export function getProjects(options) {
  return getPublicCollection('projects/', 'Projects', options)
}

export function getPosts(options) {
  return getPublicCollection('posts/', 'Posts', options)
}

export { createContactMessage }
