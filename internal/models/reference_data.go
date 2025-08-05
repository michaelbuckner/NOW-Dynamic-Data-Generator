package models

import (
	"math/rand"
	"time"
)

// ReferenceValue represents a reference value with sys_id and display_value
type ReferenceValue struct {
	SysID        string `json:"sys_id"`
	DisplayValue string `json:"display_value"`
	Extra        map[string]string `json:"extra,omitempty"`
}

// ChoiceValue represents a choice value with numeric value and display text
type ChoiceValue struct {
	Value   int    `json:"value"`
	Display string `json:"display"`
}

// ReferenceData contains all the hard-coded reference data
type ReferenceData struct {
	SysUserGroup    []ReferenceValue
	Account         []ReferenceValue
	Contact         []ReferenceValue
	SysUser         []ReferenceValue
	CmdbCiService   []ReferenceValue
	CmdbCi          []ReferenceValue
}

// ChoiceValues contains all the hard-coded choice values
type ChoiceValues struct {
	Category        []string
	CaseCategory    []string
	Subcategory     map[string][]string
	CaseSubcategory map[string][]string
	CloseCode       []string
	CaseCloseCode   []string
	ContactType     []string
	State           []ChoiceValue
	CaseState       []ChoiceValue
	CaseType        []string
	Impact          []ChoiceValue
	Urgency         []ChoiceValue
}

// GetReferenceData returns the hard-coded reference data
func GetReferenceData() *ReferenceData {
	return &ReferenceData{
		SysUserGroup: []ReferenceValue{
			{SysID: "8a5055c9c61122780043563ef53438e3", DisplayValue: "Hardware"},
			{SysID: "3ccb62b67fb30210674d91fadc8665c2", DisplayValue: "MFA Exempted User Group"},
			{SysID: "0c4e7b573b331300ad3cc9bb34efc461", DisplayValue: "Problem Analyzers"},
			{SysID: "5f74727dc0a8010e01efe33a251993f9", DisplayValue: "NY DB"},
			{SysID: "a715cd759f2002002920bde8132e7018", DisplayValue: "Change Management"},
			{SysID: "36c741fa731313005754660c4cf6a70d", DisplayValue: "Openspace"},
			{SysID: "0a52d3dcd7011200f2d224837e6103f2", DisplayValue: "Application Development"},
			{SysID: "aaccc971c0a8001500fe1ff4302de101", DisplayValue: "Capacity Mgmt"},
			{SysID: "287ebd7da9fe198100f92cc8d1d2154e", DisplayValue: "Network"},
			{SysID: "aacb62e2c0a80015007f67f752c2b12c", DisplayValue: "Project Mgmt"},
			{SysID: "b1ff30ac0a0a0b2c00aad0c66d673aa8", DisplayValue: "Customer Service"},
			{SysID: "b2ff30ac0a0a0b2c00aad0c66d673aa9", DisplayValue: "Technical Support"},
			{SysID: "b3ff30ac0a0a0b2c00aad0c66d673aa0", DisplayValue: "Account Management"},
		},
		Account: []ReferenceValue{
			{SysID: "c1c1c1c1c0a8016400b98a06818d5c11", DisplayValue: "Acme Corporation"},
			{SysID: "c2c2c2c2c0a8016400b98a06818d5c22", DisplayValue: "Globex Industries"},
			{SysID: "c3c3c3c3c0a8016400b98a06818d5c33", DisplayValue: "Initech Technologies"},
			{SysID: "c4c4c4c4c0a8016400b98a06818d5c44", DisplayValue: "Umbrella Corporation"},
			{SysID: "c5c5c5c5c0a8016400b98a06818d5c55", DisplayValue: "Stark Industries"},
			{SysID: "c6c6c6c6c0a8016400b98a06818d5c66", DisplayValue: "Wayne Enterprises"},
			{SysID: "c7c7c7c7c0a8016400b98a06818d5c77", DisplayValue: "Cyberdyne Systems"},
			{SysID: "c8c8c8c8c0a8016400b98a06818d5c88", DisplayValue: "Massive Dynamic"},
			{SysID: "c9c9c9c9c0a8016400b98a06818d5c99", DisplayValue: "Soylent Corp"},
			{SysID: "c0c0c0c0c0a8016400b98a06818d5c00", DisplayValue: "Weyland-Yutani Corp"},
		},
		Contact: []ReferenceValue{
			{SysID: "d1d1d1d1c0a8016400b98a06818d5d11", DisplayValue: "John Smith", Extra: map[string]string{"account": "c1c1c1c1c0a8016400b98a06818d5c11"}},
			{SysID: "d2d2d2d2c0a8016400b98a06818d5d22", DisplayValue: "Jane Doe", Extra: map[string]string{"account": "c1c1c1c1c0a8016400b98a06818d5c11"}},
			{SysID: "d3d3d3d3c0a8016400b98a06818d5d33", DisplayValue: "Robert Johnson", Extra: map[string]string{"account": "c2c2c2c2c0a8016400b98a06818d5c22"}},
			{SysID: "d4d4d4d4c0a8016400b98a06818d5d44", DisplayValue: "Emily Williams", Extra: map[string]string{"account": "c2c2c2c2c0a8016400b98a06818d5c22"}},
			{SysID: "d5d5d5d5c0a8016400b98a06818d5d55", DisplayValue: "Michael Brown", Extra: map[string]string{"account": "c3c3c3c3c0a8016400b98a06818d5c33"}},
			{SysID: "d6d6d6d6c0a8016400b98a06818d5d66", DisplayValue: "Sarah Miller", Extra: map[string]string{"account": "c4c4c4c4c0a8016400b98a06818d5c44"}},
			{SysID: "d7d7d7d7c0a8016400b98a06818d5d77", DisplayValue: "David Wilson", Extra: map[string]string{"account": "c5c5c5c5c0a8016400b98a06818d5c55"}},
			{SysID: "d8d8d8d8c0a8016400b98a06818d5d88", DisplayValue: "Jennifer Taylor", Extra: map[string]string{"account": "c6c6c6c6c0a8016400b98a06818d5c66"}},
			{SysID: "d9d9d9d9c0a8016400b98a06818d5d99", DisplayValue: "Thomas Anderson", Extra: map[string]string{"account": "c7c7c7c7c0a8016400b98a06818d5c77"}},
			{SysID: "d0d0d0d0c0a8016400b98a06818d5d00", DisplayValue: "Lisa Martinez", Extra: map[string]string{"account": "c8c8c8c8c0a8016400b98a06818d5c88"}},
		},
		SysUser: []ReferenceValue{
			{SysID: "5137153cc611227c000bbd1bd8cd2005", DisplayValue: "Fred Luddy"},
			{SysID: "f8588956937002002dcef157b67ffb98", DisplayValue: "Change Manager"},
			{SysID: "5137153cc611227c000bbd1bd8cd2007", DisplayValue: "David Loo"},
			{SysID: "1832fbe1d701120035ae23c7ce610369", DisplayValue: "Manifah Masood"},
			{SysID: "62526fa1d701120035ae23c7ce6103c6", DisplayValue: "Guillermo Frohlich"},
			{SysID: "f298d2d2c611227b0106c6be7f154bc8", DisplayValue: "Bow Ruggeri"},
			{SysID: "38cb3f173b331300ad3cc9bb34efc4d6", DisplayValue: "Problem Coordinator B"},
			{SysID: "73ab3f173b331300ad3cc9bb34efc4df", DisplayValue: "Problem Coordinator A"},
			{SysID: "7e3bbb173b331300ad3cc9bb34efc4a8", DisplayValue: "Problem Task Analyst A"},
			{SysID: "681b365ec0a80164000fb0b05854a0cd", DisplayValue: "ITIL User"},
		},
		CmdbCiService: []ReferenceValue{
			{SysID: "451047c6c0a8016400de0ae6df9b9d76", DisplayValue: "Bond Trading"},
			{SysID: "26e540d80a0a0bb400660482030d04d8", DisplayValue: "SAP Payroll"},
			{SysID: "d278f28f933a31003b4bb095e57ffb8a", DisplayValue: "Jobvite Enterprise Recruitment Services"},
			{SysID: "2fd0eab90a0a0bb40061cf732d32967c", DisplayValue: "PeopleSoft Governance"},
			{SysID: "26e46e5b0a0a0bb4005d1146846c429c", DisplayValue: "SAP Controlling"},
		},
		CmdbCi: []ReferenceValue{
			{SysID: "3a6b9e16c0a8ce0100e154dd7e6353c2", DisplayValue: "SAP LoadBal01"},
			{SysID: "3a27f1520a0a0bb400ecd6ff7afcf036", DisplayValue: "PS Apache02"},
			{SysID: "55c3578bc0a8010e0117f727897d0011", DisplayValue: "bond_trade_ny"},
		},
	}
}

// GetChoiceValues returns the hard-coded choice values
func GetChoiceValues() *ChoiceValues {
	return &ChoiceValues{
		Category:     []string{"Network", "Hardware", "Software", "Database", "Security", "Email", "Telephony", "Authentication", "Storage", "Web"},
		CaseCategory: []string{"Account", "Billing", "Product", "Service", "Technical", "Order", "Shipping", "Returns", "Warranty", "General"},
		Subcategory: map[string][]string{
			"Network":  {"Connectivity", "VPN", "Wireless", "DNS", "DHCP"},
			"Hardware": {"Desktop", "Laptop", "Printer", "Mobile Device", "Server"},
			"Software": {"Operating System", "Application", "Update", "License", "Installation"},
			"Database": {"Performance", "Backup", "Recovery", "Query", "Permissions"},
			"Security": {"Access", "Virus", "Firewall", "Encryption", "Policy"},
		},
		CaseSubcategory: map[string][]string{
			"Account":   {"Access", "Creation", "Modification", "Deletion", "Permissions"},
			"Billing":   {"Invoice", "Payment", "Refund", "Subscription", "Pricing"},
			"Product":   {"Defect", "Feature Request", "Documentation", "Compatibility", "Installation"},
			"Service":   {"Availability", "Quality", "Modification", "Cancellation", "Upgrade"},
			"Technical": {"Error", "Performance", "Configuration", "Integration", "Security"},
		},
		CloseCode: []string{
			"Known error", "Resolved by problem", "User error", "No resolution provided",
			"Resolved by request", "Resolved by caller", "Solution provided", "Duplicate",
		},
		CaseCloseCode: []string{
			"Solved (Permanently)", "Solved (Work Around)", "Solved (Knowledge Article)",
			"Not Solved (Not Reproducible)", "Not Solved (Too Costly)", "Not Solved (Not Supported)",
		},
		ContactType: []string{"Email", "Phone", "Self-service", "Walk-in", "Chat", "Automated", "Virtual Agent", "Social Media"},
		State: []ChoiceValue{
			{Value: 1, Display: "New"},
			{Value: 2, Display: "In Progress"},
			{Value: 3, Display: "On Hold"},
			{Value: 4, Display: "Resolved"},
			{Value: 5, Display: "Closed"},
			{Value: 6, Display: "Canceled"},
		},
		CaseState: []ChoiceValue{
			{Value: 1, Display: "New"},
			{Value: 2, Display: "In Progress"},
			{Value: 3, Display: "On Hold"},
			{Value: 4, Display: "Awaiting Customer"},
			{Value: 5, Display: "Resolved"},
			{Value: 6, Display: "Closed"},
			{Value: 7, Display: "Canceled"},
		},
		CaseType: []string{"Question", "Issue", "Feature Request", "Complaint", "Compliment", "Service Request", "Order", "Return"},
		Impact: []ChoiceValue{
			{Value: 1, Display: "High"},
			{Value: 2, Display: "Medium"},
			{Value: 3, Display: "Low"},
		},
		Urgency: []ChoiceValue{
			{Value: 1, Display: "High"},
			{Value: 2, Display: "Medium"},
			{Value: 3, Display: "Low"},
		},
	}
}

// GetRandomReference returns a random reference value from the specified table
func (rd *ReferenceData) GetRandomReference(table string) *ReferenceValue {
	rand.Seed(time.Now().UnixNano())
	
	switch table {
	case "sys_user_group":
		return &rd.SysUserGroup[rand.Intn(len(rd.SysUserGroup))]
	case "account":
		return &rd.Account[rand.Intn(len(rd.Account))]
	case "contact":
		return &rd.Contact[rand.Intn(len(rd.Contact))]
	case "sys_user":
		return &rd.SysUser[rand.Intn(len(rd.SysUser))]
	case "cmdb_ci_service":
		return &rd.CmdbCiService[rand.Intn(len(rd.CmdbCiService))]
	case "cmdb_ci":
		return &rd.CmdbCi[rand.Intn(len(rd.CmdbCi))]
	default:
		return &ReferenceValue{SysID: "unknown", DisplayValue: "Unknown"}
	}
}

// GetRandomChoice returns a random choice value from the specified field
func (cv *ChoiceValues) GetRandomChoice(field string) interface{} {
	rand.Seed(time.Now().UnixNano())
	
	switch field {
	case "category":
		return cv.Category[rand.Intn(len(cv.Category))]
	case "case_category":
		return cv.CaseCategory[rand.Intn(len(cv.CaseCategory))]
	case "close_code":
		return cv.CloseCode[rand.Intn(len(cv.CloseCode))]
	case "case_close_code":
		return cv.CaseCloseCode[rand.Intn(len(cv.CaseCloseCode))]
	case "contact_type":
		return cv.ContactType[rand.Intn(len(cv.ContactType))]
	case "state":
		return &cv.State[rand.Intn(len(cv.State))]
	case "case_state":
		return &cv.CaseState[rand.Intn(len(cv.CaseState))]
	case "case_type":
		return cv.CaseType[rand.Intn(len(cv.CaseType))]
	case "impact":
		return &cv.Impact[rand.Intn(len(cv.Impact))]
	case "urgency":
		return &cv.Urgency[rand.Intn(len(cv.Urgency))]
	default:
		return "Unknown"
	}
}

// GetRandomSubcategory returns a random subcategory based on the category
func (cv *ChoiceValues) GetRandomSubcategory(category string) string {
	rand.Seed(time.Now().UnixNano())
	
	subcategories, exists := cv.Subcategory[category]
	if !exists || len(subcategories) == 0 {
		return ""
	}
	return subcategories[rand.Intn(len(subcategories))]
}

// GetRandomCaseSubcategory returns a random case subcategory based on the category
func (cv *ChoiceValues) GetRandomCaseSubcategory(category string) string {
	rand.Seed(time.Now().UnixNano())
	
	subcategories, exists := cv.CaseSubcategory[category]
	if !exists || len(subcategories) == 0 {
		return ""
	}
	return subcategories[rand.Intn(len(subcategories))]
}
