// take a fuckin' guess (uy97722yq4a0ya5im3u9) mean=1.1254134087105927 stats={'battles': 3220, 'losses': 1987, 'wins': 1097}
export default state => {
  return [Math.random() < 0.6 ? "D" : "C", state.memory]
}