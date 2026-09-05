// p2e (j90wd98rhg6x7zq1t7si) mean=1.6886149909535744 stats={'battles': 1237, 'losses': 408, 'wins': 127}
const TEST=2.25, NEED=3

export default function bot({history:h=[],memory:m}){
	m=m&&typeof m=="object"?m:{d:0,b:0}
	m.d=Number.isFinite(m.d)?m.d:0
	m.b=Number.isFinite(m.b)?m.b:0

	if(!h.length)return["C",m]

	const x=h.at(-1).opponent

	if(x=="D"){
		m.d++
		if(m.d>=NEED)m.b=1
	}else{
		m.d=0
	}

	if(m.b)return["D",m]

	if(m.d>=TEST)
		return["C",(m.d=0,m)]

	return[x=="C"?"C":"D",m]
}
