# Integrating with Solution Accelerators

Teams at Microsoft have developed a number of Open Source projects to accelerate the ISV onboarding process with landing pages and webhooks to get started. Two of these solutions have been modified to connect to either the Commercial Marketplace or Azure Marketplace API Emulator:
  
- [Commercial-Marketplace-SaaS-Accelerator](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator) - Community Code for SaaS Applications
- [Mona SaaS](https://github.com/microsoft/mona-saas) - [M]arketplace [On]boarding [A]ccelerator

Documented below is the process to build and run in Azure with the Emulator. 

___

## Commercial Marketplace SaaS Accelerator

> This project is a community-supported reference implementation for integrating Software-as-a-Service (SaaS) solutions with Microsoft commercial marketplace SaaS offers. The SaaS Accelerator may be installed as-is or may be customized to support your requirements.

  ![SaaS Accelerator Diagram](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/blob/main/docs/images/saasoverview.png?raw=true)

Full installation details (including additional options) are provided on the [SaaS Accelerator repo](https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator/blob/main/docs/Installation-Instructions.md), but currently requires a modified version of the install script to enable the emulator config.

Modified the final 4 lines of the code below and run in the **Azure Portal Cloud Shell**.

```
dotnet tool install --global dotnet-ef; `
git clone https://github.com/Azure/Commercial-Marketplace-SaaS-Accelerator.git -b main; `
cd ./Commercial-Marketplace-SaaS-Accelerator/deployment; `
.\Deploy.ps1 `
 -WebAppNamePrefix "SOME-UNIQUE-STRING" `
 -ResourceGroupForDeployment "SOME-RG-NAME" `
 -PublisherAdminUsers "user@email.com" `
 -Location "East US" 
```

The script will create the following, that you will use directly: 
- App Service NAME-admin - service backend
- App Service NAME-portal - the Landing Page
- SQL Database AMPSaaSDB - datastore for users, offers, plans and subscriptions

### **Point to the Emulator**
Update the configuration to direct the SaaS Accelerator to the Emulator, by default it is configured for the Azure Marketplace.

- In the Azure portal select the NAME-portal App Service
- In the left bar under **Settings** select **Configuration**
- Click Edit and set the the **SaaSApiConfiguration__FulFillmentAPIBaseURL** value to `YOUR_EMULATOR_URL/api`
- Click Save at the top of the section 

### **Update the Emulator**
Now set the Emulator Landing Page to the SaaS Accelerator portal URL:
- In the Azure portal select the NAME-portal App Service
- At the **Overview** section you will see the **Default domain** - copy
- Go to the Emulator Config page
- Paste the copied **Default domain** and append **/api/azurewebhook** in the **Webhook URL** box and click **Set**
- Paste the copied **Default domain** into the **Landing Page URL** box and click **Set**
When you make a puchase through the Marketplace page it will now direct to the SaaS Accelerator

### SaaS Accelerator Admin Portal
You can obtain the admin portal URL from the NAME-portal App Service Default Domain.

### **Important**
The SaaS Accelerator SQL Database state must match that of the Emulator. If you restart the Emulator or Clear the Data File the two will be out of sync. You can reset the SQL Database state with the following: 
- In the Azure portal got to the SQL Database **AMPSaaSDB**
- Select the **Query editor (preview)**
- Clear the data using SQL - creating a Stored Procedure allows for easier repeated use

**Create a Stored Procedure**
This saves having to write a new query each time:
- Click **+ New Query** at the top
- Enter the following:
```
CREATE PROCEDURE DataCleanup

AS 
BEGIN
	DELETE [dbo].[SubscriptionAuditLogs]
	DELETE [dbo].[Subscriptions]
	DELETE [dbo].[Users]
	DELETE [dbo].[Plans]
	DELETE [dbo].[Offers]
END
```
- Click **> Run**

**Executing the query**
There are two options: 
1. Execute the Stored Procedure with the following Query: 
`EXEC AMPSaaSDB.dbo.DataCleanup; GO`
2. In the Query editor under Stored Procedures, click on the elipses next to **dbo.DataCleanup** and **View Definition**. Highlight the **5 DELETE rows** and click **>Run**.

___

## MONA SaaS

> Mona SaaS is a [M]arketplace [On]boarding [A]ccelerator designed to make it easier for Microsoft's ISV partners to rapidly onboard transactable SaaS solutions to Azure Marketplace and AppSource. It includes lightweight, reusable code modules that ISVs deploy in their own Azure subscription, and low/no-code integration templates featuring Azure Logic Apps.

![Mona SaaS Diagram](https://github.com/microsoft/mona-saas/raw/main/docs/images/mona_arch_overview.png)

Full installation details (including additional options) are provided on the [MONA SaaS GitHub Repo](https://github.com/microsoft/mona-saas), the Emulator will work with the standard deployment.

### **MONA Setup**
You should be prompted to the mona-webURL/setup to complete the configuration. Where you do not have your own URLs available the following are recommended for development: 
- **SaaS offer purchase confirmation URL**: `YOUR_EMULATOR_URL/subscriptions.html`
- **SaaS offer configuration URL**: `YOUR_EMULATOR_URL`
- **Publisher details**: `YOUR_EMULATOR_URL`
- Review + Submit

### **Point to the Emulator**
Update the configuration to direct MONA to the Emulator, by default it is configured for the Azure Marketplace. You will need to update both the App Service and the Logic Apps.

1. The App Service Update
- In the Azure portal select the mona-web-NAME App Service
- In the left bar under **Settings** select **Configuration**
- Click Edit and set the the **Deployment:PartnerCenterApiBaseUrl** value to `YOUR_EMULATOR_URL/api`
- Click Save at the top of the section 

2. Logic App Updates
- Click through the Logic Apps below and update as detailed
  - mona-on-subscription-plan-changed-NAME
  - mona-on-subscription-purchased-NAME
  - mona-on-subscription-reinstated-NAME
  - mona-on-subscription-seat-qty-changed-NAME
- Under **Development Tools** click **Logic app designer** 
- Click on the **Conditional | Notify the Marketplace** action pane
- Expand **True**
- Update the URI: `YOUR_EMULATOR_URL/api/...`
- Click **Save**

### **Update the Emulator**
Now set the Emulator Landing Page to the SaaS Accelerator portal URL:
- In the Azure portal select the mona-web-NAME App Service
- At the **Overview** section you will see the **Default domain** - copy
- Go to the Emulator Config page
- Paste the copied **Default domain** and append **/webhook** in the **Webhook URL** box and click **Set**
- Paste the copied **Default domain** into the **Landing Page URL** box and click **Set**
When you make a puchase through the Marketplace page it will now direct to the SaaS Accelerator

If you need to check the target URLs you can access in the MONA admin portal at: **Detault domain**/**admin**. To update the original config settings visit **/setup**.