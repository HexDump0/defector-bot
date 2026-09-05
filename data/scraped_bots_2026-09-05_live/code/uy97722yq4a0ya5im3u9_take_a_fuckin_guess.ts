// take a fuckin' guess (uy97722yq4a0ya5im3u9) mean=1.1385653774646451 stats={'battles': 8213, 'losses': 4997, 'wins': 2826}
export default state => {
  return [Math.random() < 0.6 ? "D" : "C", state.memory]
}